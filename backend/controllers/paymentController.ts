import { Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { db, normalizeHubId } from '../services/storage.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { IPayment } from '../models/index.js';
import { Product } from '../models/Product.js';
import { createNotification } from './notificationController.js';

const getPaymentSecret = () =>
  process.env.RAZORPAY_KEY_SECRET || process.env.JWT_SECRET || 'farmdirect_payment_secret_2026';

/**
 * Generate HMAC SHA-256 verification token for a payment transaction
 */
export const generateVerificationToken = (orderId: string, paymentId: string, amount: number): string => {
  const secret = getPaymentSecret();
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}|${amount}`).digest('hex');
};

/**
 * Create Payment Transaction (Backend Amount Source of Truth)
 */
export const createPaymentTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { orderId, paymentMethod } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required to initiate payment.' });
    }

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Security Check: Order Ownership
    if (order.customerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to order payment.' });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'Completed' || order.paymentStatus === 'PAID' || order.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Order has already been paid.' });
    }

    // Backend Source of Truth for Grand Total
    const verifiedGrandTotal = order.grandTotal;

    const paymentId = 'PAY-' + Math.floor(10000 + Math.random() * 90000);
    const verificationToken = generateVerificationToken(order.id, paymentId, verifiedGrandTotal);

    const newPayment: IPayment = {
      paymentId,
      orderId: order.id,
      userId: order.customerId,
      amount: verifiedGrandTotal,
      currency: 'INR',
      method: paymentMethod || order.paymentMethod || 'online_payment',
      status: 'PROCESSING',
      createdAt: new Date().toISOString(),
      notes: `Payment for Order #${order.id}`,
    };

    db.payments.unshift(newPayment);
    order.paymentId = paymentId;
    order.paymentStatus = 'Pending';
    db.saveData();

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;

    return res.status(201).json({
      success: true,
      message: `Payment session initialized for Order #${order.id}.`,
      payment: newPayment,
      verificationToken,
      razorpayKeyId,
      checkoutDetails: {
        orderId: order.id,
        paymentId,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        discountAmount: order.discountAmount,
        grandTotal: verifiedGrandTotal,
        currency: 'INR',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify Payment Success / Failure Callback
 */
export const verifyPaymentTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      paymentId,
      orderId,
      gatewayTransactionId,
      verificationToken,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status,
    } = req.body;

    const targetOrderId = orderId || (paymentId ? db.payments.find((p) => p.paymentId === paymentId)?.orderId : undefined);
    if (!targetOrderId) {
      return res.status(400).json({ success: false, message: 'Valid Order ID or Payment ID is required for verification.' });
    }

    const orderIndex = db.orders.findIndex((o) => o.id === targetOrderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = db.orders[orderIndex];

    // Security Check: Order Ownership
    if (order.customerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to verify payment.' });
    }

    // IDEMPOTENCY GUARD: If order is already paid, return clean success without double stock reservation
    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'Completed' || order.paymentStatus === 'Paid') {
      return res.json({
        success: true,
        message: 'Payment already verified and order confirmed.',
        order,
      });
    }

    // SECURITY PAYMENT VERIFICATION (Do not trust arbitrary client status alone)
    let isVerified = false;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpaySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      // Verify Razorpay HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      isVerified = expectedSignature === razorpay_signature;
    } else if (verificationToken && paymentId) {
      // Verify server-issued HMAC-SHA256 token
      const expectedToken = generateVerificationToken(order.id, paymentId, order.grandTotal);
      isVerified = expectedToken === verificationToken;
    } else if (process.env.PAYMENT_MODE === 'mock' || process.env.NODE_ENV !== 'production') {
      // Fallback for development/testing when explicit status is provided with valid payment ID
      const exists = db.payments.some((p) => p.orderId === order.id || p.paymentId === paymentId);
      isVerified = Boolean(exists && (status === 'SUCCESS' || status === 'Completed' || status === 'SUCCESSFUL'));
    }

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature or verification token. Payment verification failed.',
      });
    }

    const payIndex = db.payments.findIndex((p) => p.paymentId === paymentId || p.orderId === targetOrderId);
    const txnId = gatewayTransactionId || razorpay_payment_id || 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    if (payIndex !== -1) {
      db.payments[payIndex].status = 'SUCCESS';
      db.payments[payIndex].transactionId = txnId;
      db.payments[payIndex].paidAt = new Date().toISOString();
    }

    order.paymentStatus = 'PAID';
    order.orderStatus = 'Confirmed';
    order.transactionId = txnId;
    order.updatedAt = new Date().toISOString();

    // 1. DEDUCT & RESERVE STOCK ONLY NOW UPON CONFIRMED PAYMENT
    const targetHubId = order.hubId || order.deliveryHubId || 'hub_cbe';
    for (const it of order.items) {
      const prod = db.products.find((p) => p.id === it.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.quantity);
      }
      if (mongoose.connection.readyState === 1) {
        await Product.findOneAndUpdate(
          { id: it.productId },
          { $inc: { stock: -it.quantity } }
        );
      }
      db.reserveStockAtHub(targetHubId, it.productId, it.quantity, order.id);
    }

    // 2. FINALIZE WALLET DEDUCTION NOW UPON SUCCESS
    const customer = db.users.find((u) => u.id === order.customerId);
    const walletUsed = (order as any).walletAmountUsed || 0;
    if (customer && walletUsed > 0) {
      customer.walletBalance = Math.max(0, (customer.walletBalance || 0) - walletUsed);
    }

    // 3. AWARD REWARD POINTS NOW UPON SUCCESS
    const pointsEarned = (order as any).pointsEarned || Math.floor(order.subtotal / 10);
    if (customer) {
      customer.rewardPoints = (customer.rewardPoints || 0) + pointsEarned;
      if (customer.rewardPoints > 1000) customer.loyaltyTier = 'Platinum';
      else if (customer.rewardPoints > 500) customer.loyaltyTier = 'Gold';
      else if (customer.rewardPoints > 200) customer.loyaltyTier = 'Silver';
    }

    db.orders[orderIndex] = order;

    // Persist to MongoDB if active
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').updateOne(
        { id: order.id },
        {
          $set: {
            paymentStatus: 'PAID',
            orderStatus: 'Confirmed',
            transactionId: txnId,
            updatedAt: order.updatedAt,
          },
        }
      );
      if (customer) {
        await mongoose.connection.db!.collection('users').updateOne(
          { id: customer.id },
          {
            $set: {
              walletBalance: customer.walletBalance,
              rewardPoints: customer.rewardPoints,
              loyaltyTier: customer.loyaltyTier,
            },
          }
        );
      }
      if (order.paymentId) {
        await mongoose.connection.db!.collection('payments').updateOne(
          { paymentId: order.paymentId },
          { $set: { status: 'SUCCESS', transactionId: txnId, paidAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
    }

    // Trigger Notifications
    createNotification({
      userId: order.customerId,
      role: order.buyerRole || 'customer',
      title: 'Payment successful.',
      message: `Payment of ₹${order.grandTotal} for Order #${order.id} was successful. Order confirmed!`,
      type: 'payment',
      priority: 'SUCCESS',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    createNotification({
      userId: 'usr_admin',
      role: 'admin',
      title: 'New paid customer order.',
      message: `Order #${order.id} paid by ${order.customerName} (₹${order.grandTotal}).`,
      type: 'order',
      priority: 'URGENT',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    const farmerIds = Array.from(new Set(order.items.map((i) => i.farmerId)));
    farmerIds.forEach((fId) => {
      createNotification({
        userId: fId,
        role: 'farmer',
        title: 'Your produce order is confirmed.',
        message: `Order #${order.id} paid & confirmed for dispatch!`,
        type: 'order',
        priority: 'SUCCESS',
        relatedEntityId: order.id,
        relatedEntityType: 'order',
      });
    });

    db.saveData();

    return res.json({
      success: true,
      message: `Payment verified successfully! Order #${order.id} confirmed and inventory reserved.`,
      order,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retry Payment for Unpaid / Failed Order
 */
export const retryOrderPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.body;

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.customerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to retry payment.' });
    }

    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'Completed') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    const verifiedGrandTotal = Math.round((order.subtotal + (order.deliveryCharge || 0) - (order.discountAmount || 0) - ((order as any).walletAmountUsed || 0)) * 100) / 100;
    const paymentId = 'PAY-' + Math.floor(10000 + Math.random() * 90000);
    const verificationToken = generateVerificationToken(order.id, paymentId, verifiedGrandTotal);

    const newPayment: IPayment = {
      paymentId,
      orderId: order.id,
      userId: order.customerId,
      amount: verifiedGrandTotal,
      currency: 'INR',
      method: order.paymentMethod || 'online_payment',
      status: 'PROCESSING',
      createdAt: new Date().toISOString(),
      notes: `Retry Payment for Order #${order.id}`,
    };

    db.payments.unshift(newPayment);
    order.paymentId = paymentId;
    order.paymentStatus = 'Pending';
    db.saveData();

    return res.json({
      success: true,
      message: `New payment attempt #${paymentId} created for Order #${order.id}.`,
      payment: newPayment,
      verificationToken,
      grandTotal: verifiedGrandTotal,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
