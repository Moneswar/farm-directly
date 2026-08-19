import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { db, getNearestHub, calculateCustomerSellingPrice, calculateWholesalePrice, wholesalePricingConfig, calculateHubToCustomerDelivery, calculateDeliveryBoyPayout, normalizeHubId } from '../services/storage.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { IOrder, IUser, OrderStatus } from '../models/index.js';
import { Product } from '../models/Product.js';
import { seededProducts } from '../services/productsSeed.js';
import { createNotification } from './notificationController.js';

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.id;

    // Search in-memory first, then fall back to MongoDB
    let customer: IUser | undefined = db.users.find((u) => u.id === customerId);
    if (!customer && mongoose.connection.readyState === 1) {
      const usersCollection = mongoose.connection.db!.collection('users');
      const mongoUser = await usersCollection.findOne({ id: customerId });
      if (mongoUser) {
        customer = mongoUser as unknown as IUser;
        db.users.push(customer); // cache it
      }
    }

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    const { items, deliveryAddress, paymentMethod, couponCode, useWallet, deliveryMethod, pickupHubId } = req.body;

    if (!items || !items.length || !deliveryAddress) {
      return res.status(400).json({ success: false, message: 'Cart items and delivery address are required.' });
    }

    const selectedDeliveryMethod = deliveryMethod === 'home_delivery' ? 'home_delivery' : 'self_pickup';
    const deliveryInfo = calculateHubToCustomerDelivery(
      deliveryAddress.district,
      deliveryAddress.pincode,
      selectedDeliveryMethod,
      deliveryAddress.latitude || customer.latitude,
      deliveryAddress.longitude || customer.longitude
    );

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      // Search db.products first, then seededProducts fallback
      const prod =
        db.products.find((p) => p.id === item.productId || String((p as any)._id) === item.productId) ||
        seededProducts.find((p) => p.id === item.productId);

      if (!prod) {
        return res.status(400).json({ success: false, message: `Product ID ${item.productId} no longer exists.` });
      }

      // Check Hub Available Stock
      const assignedHubId = selectedDeliveryMethod === 'self_pickup'
        ? (pickupHubId ? normalizeHubId(pickupHubId) : getNearestHub(deliveryAddress.district, deliveryAddress.pincode).id)
        : getNearestHub(deliveryAddress.district, deliveryAddress.pincode).id;

      const availableHubStock = db.getAvailableStockForProductAtHub(assignedHubId, prod.id);
      if (availableHubStock > 0 && availableHubStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock available at the selected hub for "${prod.name}". Available: ${availableHubStock} ${prod.unit}`,
        });
      } else if (prod.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.name}". Available: ${prod.stock} ${prod.unit}`,
        });
      }

      const isWholesaleOrder = req.body.orderType === 'wholesale' || customer.role === 'shopkeeper';

      if (isWholesaleOrder && item.quantity < wholesalePricingConfig.defaultMinQuantity) {
        return res.status(400).json({
          success: false,
          message: `Wholesale order requires a minimum quantity of ${wholesalePricingConfig.defaultMinQuantity} ${prod.unit} for "${prod.name}".`,
        });
      }

      let totalFarmerProductCost = 0;
      let totalFarmerTransportCost = 0;
      let totalCompanyCommission = 0;
      let totalStorageHandlingCost = 0;
      let totalMarginAmount = 0;

      // Compute authoritative selling price on backend (Retail vs Wholesale)
      const sellingPrice = isWholesaleOrder
        ? calculateWholesalePrice(prod, item.quantity).wholesalePrice
        : calculateCustomerSellingPrice(prod);

      // Financial breakdown per unit
      const fPrice = prod.farmerPrice !== undefined && prod.farmerPrice > 0 ? prod.farmerPrice : prod.price;
      const transportCostPerUnit = prod.farmerToHubTransportCost !== undefined && prod.farmerToHubTransportCost > 0
        ? prod.farmerToHubTransportCost
        : (prod.transportDistanceKm ? prod.transportDistanceKm * db.pricingConfig.farmerTransportRatePerKmKg : 2.25);
      const commAmountPerUnit = prod.companyCommissionAmount !== undefined && prod.companyCommissionAmount > 0
        ? prod.companyCommissionAmount
        : Math.round(fPrice * db.pricingConfig.companyCommissionRate * 100) / 100;
      const storageCostPerUnit = prod.storageHandlingCost !== undefined ? prod.storageHandlingCost : db.pricingConfig.storageHandlingCost;

      const baseCostPerUnit = fPrice + transportCostPerUnit + commAmountPerUnit + storageCostPerUnit;

      let marginAmountPerUnit = 0;
      if (isWholesaleOrder) {
        const wholesaleInfo = calculateWholesalePrice(prod, item.quantity);
        marginAmountPerUnit = Math.round(baseCostPerUnit * wholesaleInfo.marginRate * 100) / 100;
      } else {
        marginAmountPerUnit = Math.round(baseCostPerUnit * db.pricingConfig.retailMarginRate * 100) / 100;
      }

      const itemFarmerCost = Math.round(fPrice * item.quantity * 100) / 100;
      const itemTransportCost = Math.round(transportCostPerUnit * item.quantity * 100) / 100;
      const itemCommCost = Math.round(commAmountPerUnit * item.quantity * 100) / 100;
      const itemStorageCost = Math.round(storageCostPerUnit * item.quantity * 100) / 100;
      const itemMarginCost = Math.round(marginAmountPerUnit * item.quantity * 100) / 100;
      const itemSubtotalVal = Math.round(sellingPrice * item.quantity * 100) / 100;

      totalFarmerProductCost += itemFarmerCost;
      totalFarmerTransportCost += itemTransportCost;
      totalCompanyCommission += itemCommCost;
      totalStorageHandlingCost += itemStorageCost;
      totalMarginAmount += itemMarginCost;

      // Accumulate subtotal
      subtotal += sellingPrice * item.quantity;

      // Stock is deducted immediately ONLY for Cash-on-Delivery (COD) orders.
      // Online payment orders deduct stock upon payment verification in paymentController.
      if (paymentMethod === 'COD') {
        prod.stock -= item.quantity;
      }

      orderItems.push({
        productId: prod.id,
        productName: prod.name,
        farmerId: prod.farmerId,
        farmerName: prod.farmerName,
        price: sellingPrice,
        quantity: item.quantity,
        unit: prod.unit,
        image: prod.image,
        financials: {
          farmerPrice: fPrice,
          farmerProductCost: itemFarmerCost,
          farmerToHubTransportCost: itemTransportCost,
          companyCommissionAmount: itemCommCost,
          storageHandlingCost: itemStorageCost,
          baseCostPerUnit: Math.round(baseCostPerUnit * 100) / 100,
          marginAmountPerUnit: Math.round(marginAmountPerUnit * 100) / 100,
          sellingPricePerUnit: sellingPrice,
          itemSubtotal: itemSubtotalVal,
        },
      });
    }

    // Calculate taxes and delivery charges
    const gstAmount = Math.round(subtotal * (db.deliverySettings.gstPercentage / 100) * 100) / 100;
    const deliveryCharge = selectedDeliveryMethod === 'self_pickup' ? 0 : deliveryInfo.deliveryCharge;

    let discountAmount = 0;
    if (couponCode) {
      const todayStr = new Date().toISOString().split('T')[0];
      const coupon = db.coupons.find(
        (c) => c.code.toUpperCase() === couponCode.toUpperCase() && c.isActive && (!c.validUntil || c.validUntil >= todayStr)
      );
      if (coupon && subtotal >= coupon.minOrderAmount) {
        discountAmount = Math.min((subtotal * coupon.discountPercentage) / 100, coupon.maxDiscount);
      }
    }

    let grandTotal = Math.max(0, subtotal + gstAmount + deliveryCharge - discountAmount);
    let walletUsed = 0;

    // Calculate wallet usage
    if (useWallet && customer.walletBalance > 0) {
      walletUsed = Math.min(customer.walletBalance, grandTotal);
      grandTotal -= walletUsed;
    }

    const pointsEarned = Math.floor(subtotal / 10);

    // Apply wallet deduction & reward points ONLY for COD orders immediately.
    // For online payments, these are applied ONLY AFTER payment verification.
    if (paymentMethod === 'COD') {
      if (walletUsed > 0) {
        customer.walletBalance -= walletUsed;
      }
      customer.rewardPoints += pointsEarned;
      if (customer.rewardPoints > 1000) customer.loyaltyTier = 'Platinum';
      else if (customer.rewardPoints > 500) customer.loyaltyTier = 'Gold';
      else if (customer.rewardPoints > 200) customer.loyaltyTier = 'Silver';
    }

    // Generate 6-digit Delivery OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);

    const newOrder: IOrder & { walletAmountUsed?: number; pointsEarned?: number } = {
      id: orderId,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      deliveryAddress,
      items: orderItems,
      subtotal,
      gstAmount,
      deliveryCharge,
      discountAmount,
      grandTotal,
      walletAmountUsed: walletUsed,
      pointsEarned: pointsEarned,
      paymentMethod: paymentMethod || 'online_payment',
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
      orderStatus: paymentMethod === 'COD' ? 'Confirmed' : 'Pending',
      deliveryMethod: selectedDeliveryMethod,
      deliveryDistanceKm: deliveryInfo.deliveryDistanceKm,
      deliveryHubId: deliveryInfo.hubId,
      deliveryHubName: deliveryInfo.hubName,
      hubId: deliveryInfo.hubId,
      hubName: deliveryInfo.hubName,
      hubStatus: 'Pending Processing',
      deliveryOtp,
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      placedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderType: (req.body.orderType === 'wholesale' || customer.role === 'shopkeeper') ? 'wholesale' : 'retail',
      buyerRole: customer.role === 'shopkeeper' ? 'shopkeeper' : 'customer',
      pricingSnapshot: {
        farmerProductCost: Math.round(orderItems.reduce((s, it) => s + (it.financials?.farmerProductCost || 0), 0) * 100) / 100,
        farmerTransportCost: Math.round(orderItems.reduce((s, it) => s + (it.financials?.farmerToHubTransportCost || 0), 0) * 100) / 100,
        companyCommission: Math.round(orderItems.reduce((s, it) => s + (it.financials?.companyCommissionAmount || 0), 0) * 100) / 100,
        storageHandlingCost: Math.round(orderItems.reduce((s, it) => s + (it.financials?.storageHandlingCost || 0), 0) * 100) / 100,
        retailOrWholesaleMargin: Math.round(orderItems.reduce((s, it) => s + ((it.financials?.marginAmountPerUnit || 0) * it.quantity), 0) * 100) / 100,
        itemsSubtotal: subtotal,
        deliveryCharge,
        deliveryBoyPayout: selectedDeliveryMethod === 'self_pickup' ? 0 : calculateDeliveryBoyPayout(),
        customerGrandTotal: grandTotal,
        companyGrossEarnings: Math.round(
          (orderItems.reduce((s, it) => s + (it.financials?.companyCommissionAmount || 0), 0) +
           orderItems.reduce((s, it) => s + ((it.financials?.marginAmountPerUnit || 0) * it.quantity), 0) +
           orderItems.reduce((s, it) => s + (it.financials?.storageHandlingCost || 0), 0) +
           deliveryCharge -
           (selectedDeliveryMethod === 'self_pickup' ? 0 : calculateDeliveryBoyPayout())) * 100
        ) / 100,
        appliedCommissionRate: db.pricingConfig.companyCommissionRate,
        appliedMarginRate: (req.body.orderType === 'wholesale' || customer.role === 'shopkeeper') ? 0.08 : db.pricingConfig.retailMarginRate,
      },
    };

    // Reserve stock atomically at hub & update product stock for COD
    const targetHubId = newOrder.hubId || newOrder.deliveryHubId || 'hub_cbe';
    if (paymentMethod === 'COD') {
      for (const it of newOrder.items) {
        db.reserveStockAtHub(targetHubId, it.productId, it.quantity, newOrder.id);
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
      }
    }

    db.orders.unshift(newOrder);

    // Also persist to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').insertOne({ ...newOrder });
    }

    // Clear Customer Cart
    db.carts[customer.id] = [];

    // Trigger Event Notifications
    const isWholesale = newOrder.orderType === 'wholesale';
    createNotification({
      userId: customer.id,
      role: customer.role === 'shopkeeper' ? 'shopkeeper' : 'customer',
      title: isWholesale ? `Wholesale order #${orderId} has been created.` : `Your order has been created.`,
      message: paymentMethod === 'COD'
        ? `Order #${orderId} confirmed successfully. ${selectedDeliveryMethod === 'self_pickup' ? 'Pickup code' : 'Delivery OTP'}: ${deliveryOtp}`
        : `Order #${orderId} created. Please complete payment to confirm your order.`,
      type: 'order',
      priority: 'SUCCESS',
      relatedEntityId: orderId,
      relatedEntityType: 'order',
    });

    db.saveData();

    res.status(201).json({
      success: true,
      message: paymentMethod === 'COD' ? 'Order placed successfully!' : 'Order created! Please complete payment.',
      order: newOrder,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Sync memory with MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      const mongoOrders = await mongoose.connection.db!.collection('orders').find({}).toArray();
      if (mongoOrders && mongoOrders.length > 0) {
        (mongoOrders as unknown as IOrder[]).forEach((mo) => {
          const idx = db.orders.findIndex((o) => o.id === mo.id);
          if (idx > -1) {
            db.orders[idx] = mo;
          } else {
            db.orders.unshift(mo);
          }
        });
      }
    }

    let userOrders: IOrder[] = [];

    if (user.role === 'admin') {
      userOrders = [...db.orders];
    } else if (user.role === 'customer' || user.role === 'shopkeeper') {
      // SECURITY FIX (IDOR): Strict customer ownership mapping via req.user.id
      userOrders = db.orders.filter((o) => o.customerId === user.id);
    } else if (user.role === 'farmer') {
      // Orders that contain products from this farmer
      userOrders = db.orders.filter((o) => o.items.some((item) => item.farmerId === user.id));
    } else if (user.role === 'delivery') {
      // Get Delivery Partner's assigned Hub ID from full user profile
      const fullDeliveryUser = db.users.find((u) => u.id === user.id);
      const deliveryAgentHubId = normalizeHubId(
        fullDeliveryUser?.assignedHubId || fullDeliveryUser?.distributionHubId,
        fullDeliveryUser?.district,
        fullDeliveryUser?.pincode
      );

      // Filter orders: MUST be home_delivery AND MUST belong to delivery agent's assigned hub
      userOrders = db.orders.filter((o) => {
        const isHomeDelivery = o.deliveryMethod !== 'self_pickup'; // Exclude self_pickup orders
        const orderHubId = normalizeHubId(o.hubId || o.deliveryHubId, o.deliveryAddress?.district, o.deliveryAddress?.pincode);
        const isSameHub = !deliveryAgentHubId || orderHubId === deliveryAgentHubId;
        const isAssignedToMe = Boolean(o.deliveryBoyId && o.deliveryBoyId === user.id);
        const isUnassignedAvailable = (!o.deliveryBoyId || o.deliveryBoyId === '') &&
          (['Confirmed', 'Assigned', 'Hub Processing', 'Pending Processing', 'Pending'].includes(o.orderStatus as string));

        return isHomeDelivery && isSameHub && (isAssignedToMe || isUnassignedAvailable);
      });

      // SECURITY: Redact deliveryOtp so delivery partner never receives expected OTP in API responses
      userOrders = userOrders.map((o) => {
        const { deliveryOtp: _redacted, ...orderWithoutOtp } = o;
        return orderWithoutOtp as IOrder;
      });
    }

    res.json({ success: true, count: userOrders.length, orders: userOrders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignDeliveryBoy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    let { deliveryBoyId } = req.body;

    // If request comes from a delivery agent, allow self-assigning if deliveryBoyId not specified
    if (!deliveryBoyId && req.user?.role === 'delivery') {
      deliveryBoyId = req.user.id;
    }

    const orderIndex = db.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = db.orders[orderIndex];

    // 1. SELF PICKUP GUARD: Self Pickup orders must NEVER be assigned to a Delivery Boy
    if (order.deliveryMethod === 'self_pickup') {
      return res.status(400).json({
        success: false,
        message: 'Self Pickup orders cannot be assigned to a Delivery Partner. Customer will collect directly from the hub.',
      });
    }

    // 2. ORDER STATUS GUARD: Rejects completed or cancelled orders
    if (order.orderStatus === 'Delivered' || (order.orderStatus as string) === 'Completed' || order.orderStatus === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot assign delivery partner. Order status is already '${order.orderStatus}'.`,
      });
    }

    let deliveryBoy = db.users.find((u) => u.id === deliveryBoyId);
    if (!deliveryBoy && mongoose.connection.readyState === 1) {
      const mongoUser = await mongoose.connection.db!.collection('users').findOne({ id: deliveryBoyId });
      if (mongoUser) {
        deliveryBoy = mongoUser as unknown as IUser;
        db.users.push(deliveryBoy); // cache it
      }
    }

    // Fallback if requesting delivery user self-assigns
    if (!deliveryBoy && req.user?.role === 'delivery') {
      const reqDeliveryProfile = db.users.find((u) => u.id === req.user?.id);
      deliveryBoy = reqDeliveryProfile || ({
        id: req.user.id,
        name: req.user.name,
        phone: '',
        email: req.user.email,
        role: 'delivery',
        district: 'Coimbatore',
      } as IUser);
    }

    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Selected delivery agent not found' });
    }

    // 3. HUB MATCH GUARD: Delivery Boy must belong to the order's assigned distribution hub
    const deliveryBoyHubId = normalizeHubId(deliveryBoy.assignedHubId || deliveryBoy.distributionHubId, deliveryBoy.district, deliveryBoy.pincode);
    const orderHubId = normalizeHubId(order.hubId || order.deliveryHubId, order.deliveryAddress?.district, order.deliveryAddress?.pincode);

    console.log(`[DEBUG assignDeliveryBoy] deliveryBoyId: ${deliveryBoy.id}, name: ${deliveryBoy.name}, deliveryBoyHubId: ${deliveryBoyHubId}, orderHubId: ${orderHubId}`);

    if (deliveryBoyHubId !== orderHubId) {
      const orderHubName = order.hubName || order.deliveryHubName || 'Distribution Hub';
      return res.status(400).json({
        success: false,
        message: `Delivery Partner "${deliveryBoy.name}" belongs to a different distribution hub. Cannot assign order from ${orderHubName}.`,
      });
    }

    order.deliveryBoyId = deliveryBoy.id;
    order.deliveryBoyName = deliveryBoy.name;
    order.deliveryBoyPhone = deliveryBoy.phone || (req.user as any)?.phone || '+91 98765 43213';
    order.orderStatus = 'Assigned';
    order.updatedAt = new Date().toISOString();

    db.orders[orderIndex] = order;

    // Sync to MongoDB if active
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').updateOne(
        { id: order.id },
        {
          $set: {
            deliveryBoyId: deliveryBoy.id,
            deliveryBoyName: deliveryBoy.name,
            deliveryBoyPhone: order.deliveryBoyPhone,
            orderStatus: 'Assigned',
            updatedAt: order.updatedAt,
          },
        }
      );
    }

    // Notify delivery agent & customer safely
    createNotification({
      userId: deliveryBoy.id,
      role: 'delivery',
      title: 'New customer delivery assigned.',
      message: `New delivery assigned from ${order.hubName || 'Distribution Hub'} for Order #${order.id}.`,
      type: 'delivery',
      priority: 'URGENT',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    createNotification({
      userId: order.customerId,
      role: order.buyerRole || 'customer',
      title: 'Delivery partner has been assigned.',
      message: `Delivery partner ${deliveryBoy.name} has been assigned for Order #${order.id}.`,
      type: 'delivery',
      priority: 'INFO',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    db.saveData();

    res.json({ success: true, message: `Order #${order.id} assigned to ${deliveryBoy.name}`, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Confirmed: ['Assigned', 'Hub Processing', 'Ready for Pickup', 'Cancelled'],
  Assigned: ['Pickup Complete', 'Picked Up from Hub', 'Out for Delivery', 'Cancelled'],
  'Pickup Complete': ['Arrived at Hub', 'Hub Processing', 'Out for Delivery', 'Cancelled'],
  'Picked Up from Hub': ['Out for Delivery', 'Delivered', 'Cancelled'],
  'Arrived at Hub': ['Hub Processing', 'Out for Delivery', 'Cancelled'],
  'Hub Processing': ['Out for Delivery', 'Ready for Pickup', 'Cancelled'],
  'Ready for Pickup': ['Completed', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Delivered: [],
  Completed: [],
  Cancelled: [],
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, otp, digitalSignature, deliveryProofImage } = req.body;
    const userRole = req.user?.role;

    if (userRole === 'customer') {
      return res.status(403).json({ success: false, message: 'Customers are not authorized to modify order status.' });
    }

    const orderIndex = db.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = db.orders[orderIndex];

    // Ensure legacy orders have a hub assigned seamlessly
    if (!order.hubId || !order.hubName) {
      const nearestHub = getNearestHub(order.deliveryAddress?.district || 'Coimbatore', order.deliveryAddress?.pincode || '641001');
      order.hubId = nearestHub.id;
      order.hubName = nearestHub.name;
      order.hubStatus = order.hubStatus || 'Pending Processing';
    }

    // Role-specific permission controls
    if (userRole === 'farmer') {
      if (['Delivered', 'Out for Delivery', 'Arrived at Hub', 'Hub Processing'].includes(status)) {
        return res.status(403).json({
          success: false,
          message: 'Farmers cannot mark orders as Delivered or dispatch from Distribution Hub.',
        });
      }
    }

    // Terminal state guard: Delivered, Completed or Cancelled orders CANNOT be modified
    if (order.orderStatus === 'Delivered' || (order.orderStatus as string) === 'Completed' || order.orderStatus === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Order #${order.id} is already ${order.orderStatus} and cannot be modified or transitioned.`,
      });
    }

    // Strict transition validation for non-admin users
    if (userRole !== 'admin') {
      const allowed = ALLOWED_TRANSITIONS[order.orderStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from "${order.orderStatus}" to "${status}". Allowed next step(s): ${
            allowed.join(', ') || 'None'
          }.`,
        });
      }
    }

    // OTP verification when completing final home delivery
    if (status === 'Delivered') {
      const cleanInputOtp = String(otp || '').trim();
      const cleanOrderOtp = String(order.deliveryOtp || '').trim();

      if (!cleanInputOtp || cleanInputOtp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Please enter the complete 6-digit delivery OTP provided by the customer.',
        });
      }

      if (cleanOrderOtp && cleanInputOtp !== cleanOrderOtp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid delivery OTP. Please ask the customer to provide the correct OTP.',
        });
      }

      const now = new Date().toISOString();
      order.paymentStatus = 'Completed';
      order.deliveredAt = now;
      order.deliveryOtpVerified = true;
      order.deliveryOtpVerifiedAt = now;
      order.deliveryCompletedBy = req.user?.id || order.deliveryBoyId;
      if (digitalSignature) order.digitalSignature = digitalSignature;
      if (deliveryProofImage) order.deliveryProofImage = deliveryProofImage;

      // Credit farmer earnings & delivery boy earnings
      const farmerIds = Array.from(new Set(order.items.map((i) => i.farmerId)));
      farmerIds.forEach((fId) => {
        const farmerObj = db.users.find((u) => u.id === fId);
        if (farmerObj) {
          const farmerSubtotal = order.items
            .filter((i) => i.farmerId === fId)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
          farmerObj.walletBalance = (farmerObj.walletBalance || 0) + farmerSubtotal;
        }
      });

      // Home Delivery Payout Creation (Strictly for Home Delivery, excluded for Self Pickup)
      if (order.deliveryMethod !== 'self_pickup' && order.deliveryBoyId) {
        let deliveryAgent = db.users.find((u) => u.id === order.deliveryBoyId);
        if (!deliveryAgent && req.user?.id === order.deliveryBoyId) {
          deliveryAgent = db.users.find((u) => u.id === req.user.id);
        }
        if (!deliveryAgent && mongoose.connection.readyState === 1) {
          const mongoAgent = await mongoose.connection.db!.collection('users').findOne({ id: order.deliveryBoyId });
          if (mongoAgent) {
            deliveryAgent = mongoAgent as unknown as IUser;
            db.users.push(deliveryAgent);
          }
        }

        const configuredPayout = order.pricingSnapshot?.deliveryBoyPayout || db.pricingConfig?.deliveryBoyDefaultPayout || 60;
        
        // DUPLICATE PAYOUT PREVENTION GUARD (Idempotent)
        const existingPayout = db.payouts.find((p) => p.orderId === order.id && p.deliveryBoyId === order.deliveryBoyId);
        if (!existingPayout) {
          if (deliveryAgent) {
            deliveryAgent.walletBalance = (deliveryAgent.walletBalance || 0) + configuredPayout;
            if (mongoose.connection.readyState === 1) {
              await mongoose.connection.db!.collection('users').updateOne(
                { id: deliveryAgent.id },
                { $set: { walletBalance: deliveryAgent.walletBalance } }
              );
            }
          }

          const custCharge = order.deliveryCharge || 0;
          const netLogisticsBal = Math.round((custCharge - configuredPayout) * 100) / 100;
          const payoutId = 'DPO-' + Math.floor(100000 + Math.random() * 900000);

          db.payouts.unshift({
            id: payoutId,
            orderId: order.id,
            deliveryBoyId: order.deliveryBoyId,
            deliveryBoyName: deliveryAgent?.name || order.deliveryBoyName || 'Delivery Partner',
            hubId: order.hubId || order.deliveryHubId || 'hub_cbe',
            hubName: order.hubName || order.deliveryHubName || 'Coimbatore Distribution Hub',
            deliveryMethod: 'home_delivery',
            deliveryDistanceKm: order.deliveryDistanceKm || 6.5,
            customerDeliveryCharge: custCharge,
            deliveryBoyPayout: configuredPayout,
            deliveryLogisticsBalance: netLogisticsBal,
            status: 'EARNED',
            createdAt: now,
          });
        }
      }
    }

    // Self Pickup completion — OTP verification + farmer wallet credit (NO delivery boy payout)
    if (status === 'Completed') {
      if (order.deliveryMethod !== 'self_pickup') {
        return res.status(400).json({
          success: false,
          message: `'Completed' status is only valid for Self Pickup orders. Home Delivery orders use 'Delivered'.`,
        });
      }

      const { pickupVerificationCode } = req.body;
      const cleanInputCode = String(pickupVerificationCode || otp || '').trim();
      const cleanOrderOtp = String(order.deliveryOtp || '').trim();

      if (cleanOrderOtp && cleanInputCode !== cleanOrderOtp) {
        return res.status(400).json({
          success: false,
          message: `Invalid Pickup Verification Code. Please ask the customer to show the code from their order details.`,
        });
      }

      order.paymentStatus = 'Completed';
      order.pickupCompletedAt = new Date().toISOString();
      order.pickupVerificationCode = cleanInputCode;

      // Credit farmer earnings (NO delivery boy payout for self pickup)
      const farmerIds = Array.from(new Set(order.items.map((i) => i.farmerId)));
      farmerIds.forEach((fId) => {
        const farmerObj = db.users.find((u) => u.id === fId);
        if (farmerObj) {
          const farmerSubtotal = order.items
            .filter((i) => i.farmerId === fId)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
          farmerObj.walletBalance = (farmerObj.walletBalance || 0) + farmerSubtotal;
        }
      });
    }

    // Synchronize Hub Status with Order Logistics Lifecycle
    if (status === 'Arrived at Hub') {
      order.hubStatus = 'Arrived at Hub';
    } else if (status === 'Hub Processing') {
      order.hubStatus = 'Hub Processing';
    } else if (status === 'Ready for Pickup') {
      order.hubStatus = 'Ready for Pickup';
    } else if (status === 'Out for Delivery') {
      order.hubStatus = 'Dispatched from Hub';
    } else if (status === 'Delivered' || status === 'Completed') {
      order.hubStatus = 'Completed';
    }

    order.orderStatus = status as OrderStatus;
    order.updatedAt = new Date().toISOString();

    // Inventory Movement Triggers
    const targetHubId = order.hubId || order.deliveryHubId || 'hub_cbe';
    if (status === 'Cancelled') {
      order.items.forEach((it) => {
        db.releaseStockAtHub(targetHubId, it.productId, it.quantity, order.id);
        const prod = db.products.find((p) => p.id === it.productId);
        if (prod) prod.stock += it.quantity;
      });
    } else if (['Out for Delivery', 'Dispatched from Hub', 'Delivered', 'Completed'].includes(status)) {
      order.items.forEach((it) => {
        db.dispatchStockAtHub(targetHubId, it.productId, it.quantity, order.id);
      });
    }

    db.orders[orderIndex] = order;


    // Sync to MongoDB if active
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').updateOne(
        { id: order.id },
        {
          $set: {
            orderStatus: order.orderStatus,
            hubId: order.hubId,
            hubName: order.hubName,
            hubStatus: order.hubStatus,
            paymentStatus: order.paymentStatus,
            updatedAt: order.updatedAt,
            ...(order.deliveredAt ? { deliveredAt: order.deliveredAt } : {}),
            ...(order.deliveryOtpVerified !== undefined ? { deliveryOtpVerified: order.deliveryOtpVerified } : {}),
            ...(order.deliveryOtpVerifiedAt ? { deliveryOtpVerifiedAt: order.deliveryOtpVerifiedAt } : {}),
            ...(order.deliveryCompletedBy ? { deliveryCompletedBy: order.deliveryCompletedBy } : {}),
            ...(order.digitalSignature ? { digitalSignature: order.digitalSignature } : {}),
            ...(order.deliveryProofImage ? { deliveryProofImage: order.deliveryProofImage } : {}),
            ...(order.pickupCompletedAt ? { pickupCompletedAt: order.pickupCompletedAt } : {}),
          },
        }
      );
    }

    // Dispatch Role-Specific Status Notifications via createNotification
    let notifTitle = `Order status updated: ${status}`;
    let notifMessage = `Your Order #${order.id} is now "${status}" at ${order.hubName || 'Distribution Hub'}.`;

    if (status === 'Hub Processing') {
      notifTitle = 'Your order is being processed at the hub.';
      notifMessage = `Order #${order.id} is currently being prepared at ${order.hubName || 'Distribution Hub'}.`;
    } else if (status === 'Ready for Pickup') {
      notifTitle = 'Your order is ready for pickup.';
      notifMessage = `Order #${order.id} is ready at ${order.hubName || 'Distribution Hub'}. Code: ${order.deliveryOtp}`;
    } else if (status === 'Out for Delivery') {
      notifTitle = 'Your order is out for delivery.';
      notifMessage = `Order #${order.id} is out for delivery with ${order.deliveryBoyName || 'your delivery agent'}.`;
    } else if (status === 'Delivered') {
      notifTitle = 'Your order has been delivered.';
      notifMessage = `Order #${order.id} has been delivered successfully. Thank you for buying direct from farmers!`;
    } else if (status === 'Completed') {
      notifTitle = 'Your pickup has been completed.';
      notifMessage = `Order #${order.id} has been picked up from ${order.hubName || 'Distribution Hub'}.`;
    } else if (status === 'Cancelled') {
      notifTitle = 'Your order has been cancelled.';
      notifMessage = `Order #${order.id} has been cancelled.`;
    }

    createNotification({
      userId: order.customerId,
      role: order.buyerRole || 'customer',
      title: notifTitle,
      message: notifMessage,
      type: 'order',
      priority: status === 'Cancelled' ? 'WARNING' : status === 'Delivered' || status === 'Completed' ? 'SUCCESS' : 'INFO',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    if (status === 'Cancelled' && order.deliveryBoyId) {
      createNotification({
        userId: order.deliveryBoyId,
        role: 'delivery',
        title: `Order #${order.id} has been cancelled.`,
        message: `Order #${order.id} assigned to you has been cancelled.`,
        type: 'delivery',
        priority: 'WARNING',
        relatedEntityId: order.id,
        relatedEntityType: 'order',
      });
    }

    if ((status === 'Delivered' || status === 'Completed') && order.pricingSnapshot) {
      const farmerIds = Array.from(new Set(order.items.map((i) => i.farmerId)));
      farmerIds.forEach((fId) => {
        createNotification({
          userId: fId,
          role: 'farmer',
          title: 'Farmer earnings updated.',
          message: `Earnings credited to your wallet for completed Order #${order.id}.`,
          type: 'order',
          priority: 'SUCCESS',
          relatedEntityId: order.id,
          relatedEntityType: 'order',
        });
      });
    }

    db.saveData();

    let currentAgent = db.users.find((u) => u.id === req.user?.id || u.id === order.deliveryBoyId);
    res.json({
      success: true,
      message: `Order #${order.id} status updated to '${status}'`,
      order,
      walletBalance: currentAgent?.walletBalance,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const calculateDeliveryPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { district, pincode, deliveryMethod, latitude, longitude } = req.body;
    if (deliveryMethod === 'home_delivery' && (!district || !pincode)) {
      res.status(400).json({
        success: false,
        message: 'Please update your delivery address/location before selecting Home Delivery.',
      });
      return;
    }
    const result = calculateHubToCustomerDelivery(district, pincode, deliveryMethod, latitude, longitude);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Unable to calculate delivery distance. Please verify your address.',
    });
  }
};

// ─── SELF PICKUP: Mark Order Ready for Pickup ─────────────────────────────────
export const markReadyForPickup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userRole = req.user?.role;

    if (userRole === 'customer' || userRole === 'delivery') {
      res.status(403).json({ success: false, message: 'Only admin or farmer can mark an order Ready for Pickup.' });
      return;
    }

    const orderIndex = db.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = db.orders[orderIndex];

    if (order.deliveryMethod !== 'self_pickup') {
      res.status(400).json({ success: false, message: 'This action is only valid for Self Pickup orders.' });
      return;
    }

    if (order.orderStatus === 'Ready for Pickup') {
      res.status(400).json({ success: false, message: 'Order is already marked Ready for Pickup.' });
      return;
    }

    if (!['Confirmed', 'Hub Processing'].includes(order.orderStatus)) {
      res.status(400).json({
        success: false,
        message: `Cannot mark Ready for Pickup. Current status: "${order.orderStatus}". Must be Confirmed or Hub Processing.`,
      });
      return;
    }

    order.orderStatus = 'Ready for Pickup';
    order.hubStatus = 'Ready for Pickup';
    order.updatedAt = new Date().toISOString();
    db.orders[orderIndex] = order;

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').updateOne(
        { id: order.id },
        { $set: { orderStatus: 'Ready for Pickup', hubStatus: 'Ready for Pickup', updatedAt: order.updatedAt } }
      );
    }

    db.notifications.push({
      id: 'notif_' + Date.now(),
      userId: order.customerId,
      title: '📦 Your Order is Ready for Pickup!',
      message: `Order #${order.id} is ready for collection at ${order.hubName || 'Distribution Hub'}. Please bring your 4-digit pickup verification code.`,
      type: 'order',
      read: false,
      createdAt: new Date().toISOString(),
    });

    db.saveData();
    res.json({ success: true, message: `Order #${order.id} marked Ready for Pickup.`, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SELF PICKUP: Complete Pickup (OTP-verified by Hub Staff) ─────────────────
export const completePickup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { pickupVerificationCode, otp } = req.body;
    const userRole = req.user?.role;

    if (userRole === 'customer' || userRole === 'delivery') {
      res.status(403).json({ success: false, message: 'Only admin or farmer can complete a self pickup.' });
      return;
    }

    const orderIndex = db.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = db.orders[orderIndex];

    if (order.deliveryMethod !== 'self_pickup') {
      res.status(400).json({ success: false, message: 'This action is only valid for Self Pickup orders.' });
      return;
    }

    if ((order.orderStatus as string) === 'Completed') {
      res.status(400).json({ success: false, message: 'This order has already been picked up and completed.' });
      return;
    }

    if (order.orderStatus === 'Cancelled') {
      res.status(400).json({ success: false, message: 'Cannot complete a cancelled order.' });
      return;
    }

    if (order.orderStatus !== 'Ready for Pickup') {
      res.status(400).json({
        success: false,
        message: `Order must be in "Ready for Pickup" status to complete pickup. Current: "${order.orderStatus}".`,
      });
      return;
    }

    // Pickup OTP verification
    const cleanInputCode = String(pickupVerificationCode || otp || '').trim();
    const cleanOrderOtp = String(order.deliveryOtp || '').trim();

    if (cleanOrderOtp && cleanInputCode !== cleanOrderOtp) {
      res.status(400).json({
        success: false,
        message: 'Invalid Pickup Verification Code. Please ask the customer to show their 4-digit code from the order details page.',
      });
      return;
    }

    const now = new Date().toISOString();
    order.orderStatus = 'Completed' as OrderStatus;
    order.hubStatus = 'Completed';
    order.paymentStatus = 'Completed';
    order.pickupCompletedAt = now;
    order.pickupVerificationCode = cleanInputCode;
    order.updatedAt = now;
    db.orders[orderIndex] = order;

    // Credit farmer earnings — NO delivery boy payout for self pickup
    const farmerIds = Array.from(new Set(order.items.map((i) => i.farmerId)));
    farmerIds.forEach((fId) => {
      const farmerObj = db.users.find((u) => u.id === fId);
      if (farmerObj) {
        const farmerSubtotal = order.items
          .filter((i) => i.farmerId === fId)
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        farmerObj.walletBalance = (farmerObj.walletBalance || 0) + farmerSubtotal;
      }
    });

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').updateOne(
        { id: order.id },
        { $set: { orderStatus: 'Completed', hubStatus: 'Completed', paymentStatus: 'Completed', pickupCompletedAt: now, updatedAt: now } }
      );
    }

    db.notifications.push({
      id: 'notif_' + Date.now(),
      userId: order.customerId,
      title: '✅ Order Pickup Completed!',
      message: `Your Order #${order.id} has been collected from ${order.hubName || 'Distribution Hub'}. Thank you for choosing FarmDirect!`,
      type: 'order',
      read: false,
      createdAt: new Date().toISOString(),
    });

    db.saveData();
    res.json({ success: true, message: `Order #${order.id} pickup completed successfully.`, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orderIndex = db.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = db.orders[orderIndex];

    // Security check: Only the customer who placed the order or an admin can cancel
    if (order.customerId !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this order.' });
    }

    // Cancellation is ONLY allowed when status is 'Pending' or 'Confirmed' or 'Assigned' or 'Hub Processing'
    if (!['Pending', 'Confirmed', 'Assigned', 'Hub Processing', 'Pending Processing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order #${order.id} cannot be cancelled because it is already '${order.orderStatus}'.`,
      });
    }

    // 1. Release reserved stock at hub & restore product stock
    const targetHubId = order.hubId || order.deliveryHubId || 'hub_cbe';
    for (const it of order.items) {
      db.releaseStockAtHub(targetHubId, it.productId, it.quantity, order.id);
      const prod = db.products.find((p) => p.id === it.productId);
      if (prod) {
        prod.stock += it.quantity;
      }
      if (mongoose.connection.readyState === 1) {
        await Product.findOneAndUpdate(
          { id: it.productId },
          { $inc: { stock: it.quantity } }
        );
      }
    }

    // 2. Refund wallet if wallet balance was used
    const walletUsed = (order as any).walletAmountUsed || 0;
    const customer = db.users.find((u) => u.id === order.customerId);
    let refundAmount = 0;
    if (customer) {
      if (walletUsed > 0) {
        customer.walletBalance = (customer.walletBalance || 0) + walletUsed;
        refundAmount += walletUsed;
      }
      // If payment was online and verified (PAID), refund grand total to wallet
      if (order.paymentStatus === 'PAID' || order.paymentStatus === 'Completed') {
        customer.walletBalance = (customer.walletBalance || 0) + order.grandTotal;
        refundAmount += order.grandTotal;
      }
      // Revert points earned
      const pointsEarned = (order as any).pointsEarned || Math.floor(order.subtotal / 10);
      customer.rewardPoints = Math.max(0, (customer.rewardPoints || 0) - pointsEarned);
    }

    // 3. Update order and payment statuses
    order.orderStatus = 'Cancelled';
    order.paymentStatus =
      order.paymentStatus === 'PAID' || order.paymentStatus === 'Completed'
        ? 'REFUNDED'
        : 'CANCELLED';
    order.updatedAt = new Date().toISOString();

    db.orders[orderIndex] = order;

    // Sync to MongoDB if active
    if (mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.db!.collection('orders').updateOne(
          { id: order.id },
          { $set: { orderStatus: 'Cancelled', paymentStatus: order.paymentStatus, updatedAt: order.updatedAt } }
        );
        if (customer) {
          await mongoose.connection.db!.collection('users').updateOne(
            { id: customer.id },
            { $set: { walletBalance: customer.walletBalance, rewardPoints: customer.rewardPoints } }
          );
        }
      } catch (e) {
        console.error('MongoDB sync error on cancelOrder:', e);
      }
    }

    // 4. Dispatch Notifications
    createNotification({
      userId: order.customerId,
      role: order.buyerRole || 'customer',
      title: 'Order Cancelled',
      message: `Order #${order.id} has been cancelled.${refundAmount > 0 ? ` ₹${refundAmount} has been refunded to your wallet.` : ''}`,
      type: 'order',
      priority: 'WARNING',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    if (order.deliveryBoyId) {
      createNotification({
        userId: order.deliveryBoyId,
        role: 'delivery',
        title: `Order #${order.id} Cancelled`,
        message: `Order #${order.id} assigned to you was cancelled.`,
        type: 'delivery',
        priority: 'WARNING',
        relatedEntityId: order.id,
        relatedEntityType: 'order',
      });
    }

    db.saveData();

    return res.json({
      success: true,
      message: `Order #${order.id} cancelled successfully.${refundAmount > 0 ? ` ₹${refundAmount} credited to wallet.` : ''}`,
      order,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyDeliveryOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { otp, digitalSignature, deliveryProofImage } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (user.role === 'customer') {
      res.status(403).json({ success: false, message: 'Customers are not authorized to verify delivery OTP.' });
      return;
    }

    const orderIndex = db.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = db.orders[orderIndex];

    if (order.deliveryMethod === 'self_pickup') {
      res.status(400).json({
        success: false,
        message: 'Self Pickup orders are collected directly at the hub counter, not via home delivery OTP.',
      });
      return;
    }

    // Terminal state guard: Already delivered or cancelled
    if (order.orderStatus === 'Delivered' || (order.orderStatus as string) === 'Completed') {
      res.status(400).json({
        success: false,
        message: `Order #${order.id} is already Delivered. Cannot deliver again.`,
      });
      return;
    }

    if (order.orderStatus === 'Cancelled') {
      res.status(400).json({
        success: false,
        message: `Order #${order.id} is cancelled and cannot be delivered.`,
      });
      return;
    }

    // Authorization: Only the assigned delivery agent or admin can complete delivery
    if (user.role === 'delivery' && order.deliveryBoyId && order.deliveryBoyId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'You are not the assigned delivery partner for this order.',
      });
      return;
    }

    // OTP validation
    const cleanInputOtp = String(otp || '').trim();
    const cleanOrderOtp = String(order.deliveryOtp || '').trim();

    if (!cleanInputOtp || cleanInputOtp.length !== 6) {
      res.status(400).json({
        success: false,
        message: 'Please enter the complete 6-digit delivery OTP provided by the customer.',
      });
      return;
    }

    if (!cleanOrderOtp || cleanInputOtp !== cleanOrderOtp) {
      res.status(400).json({
        success: false,
        message: 'Invalid delivery OTP. Please ask the customer to provide the correct OTP.',
      });
      return;
    }

    const now = new Date().toISOString();
    order.orderStatus = 'Delivered';
    order.hubStatus = 'Completed';
    order.paymentStatus = 'Completed';
    order.deliveredAt = now;
    order.deliveryOtpVerified = true;
    order.deliveryOtpVerifiedAt = now;
    order.deliveryCompletedBy = user.id;
    if (digitalSignature) order.digitalSignature = digitalSignature;
    if (deliveryProofImage) order.deliveryProofImage = deliveryProofImage;
    order.updatedAt = now;

    // 1. Credit farmer earnings
    const farmerIds = Array.from(new Set(order.items.map((i) => i.farmerId)));
    farmerIds.forEach((fId) => {
      const farmerObj = db.users.find((u) => u.id === fId);
      if (farmerObj) {
        const farmerSubtotal = order.items
          .filter((i) => i.farmerId === fId)
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
        farmerObj.walletBalance = (farmerObj.walletBalance || 0) + farmerSubtotal;
      }
    });

    // 2. Credit delivery agent earnings idempotently
    const assignedAgentId = order.deliveryBoyId || user.id;
    let deliveryAgent = db.users.find((u) => u.id === assignedAgentId);
    if (!deliveryAgent && user.id === assignedAgentId) {
      deliveryAgent = db.users.find((u) => u.id === user.id);
    }
    if (!deliveryAgent && mongoose.connection.readyState === 1) {
      const mongoAgent = await mongoose.connection.db!.collection('users').findOne({ id: assignedAgentId });
      if (mongoAgent) {
        deliveryAgent = mongoAgent as unknown as IUser;
        db.users.push(deliveryAgent);
      }
    }

    const configuredPayout = order.pricingSnapshot?.deliveryBoyPayout || db.pricingConfig?.deliveryBoyDefaultPayout || 60;

    // Duplicate payout guard (Idempotent)
    const existingPayout = db.payouts.find((p) => p.orderId === order.id && p.deliveryBoyId === assignedAgentId);
    if (!existingPayout) {
      if (deliveryAgent) {
        deliveryAgent.walletBalance = (deliveryAgent.walletBalance || 0) + configuredPayout;
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db!.collection('users').updateOne(
            { id: deliveryAgent.id },
            { $set: { walletBalance: deliveryAgent.walletBalance } }
          );
        }
      }

      const custCharge = order.deliveryCharge || 0;
      const netLogisticsBal = Math.round((custCharge - configuredPayout) * 100) / 100;
      const payoutId = 'DPO-' + Math.floor(100000 + Math.random() * 900000);

      db.payouts.unshift({
        id: payoutId,
        orderId: order.id,
        deliveryBoyId: assignedAgentId,
        deliveryBoyName: deliveryAgent?.name || order.deliveryBoyName || 'Delivery Partner',
        hubId: order.hubId || order.deliveryHubId || 'hub_cbe',
        hubName: order.hubName || order.deliveryHubName || 'Coimbatore Distribution Hub',
        deliveryMethod: 'home_delivery',
        deliveryDistanceKm: order.deliveryDistanceKm || 6.5,
        customerDeliveryCharge: custCharge,
        deliveryBoyPayout: configuredPayout,
        deliveryLogisticsBalance: netLogisticsBal,
        status: 'EARNED',
        createdAt: now,
      });
    }

    // 3. Dispatch Stock from Hub
    const targetHubId = order.hubId || order.deliveryHubId || 'hub_cbe';
    order.items.forEach((it) => {
      db.dispatchStockAtHub(targetHubId, it.productId, it.quantity, order.id);
    });

    db.orders[orderIndex] = order;

    // 4. MongoDB Persistence
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db!.collection('orders').updateOne(
        { id: order.id },
        {
          $set: {
            orderStatus: 'Delivered',
            hubStatus: 'Completed',
            paymentStatus: 'Completed',
            deliveredAt: now,
            deliveryOtpVerified: true,
            deliveryOtpVerifiedAt: now,
            deliveryCompletedBy: user.id,
            updatedAt: now,
            ...(digitalSignature ? { digitalSignature } : {}),
            ...(deliveryProofImage ? { deliveryProofImage } : {}),
          },
        }
      );
    }

    // 5. Notifications
    createNotification({
      userId: order.customerId,
      role: order.buyerRole || 'customer',
      title: 'Your order has been delivered.',
      message: `Your FarmDirect order #${order.id} has been delivered successfully. Thank you for buying direct from farmers!`,
      type: 'order',
      priority: 'SUCCESS',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    if (deliveryAgent) {
      createNotification({
        userId: deliveryAgent.id,
        role: 'delivery',
        title: 'Delivery completed.',
        message: `Delivery completed for Order #${order.id}. ₹${configuredPayout} earned and credited to your wallet.`,
        type: 'delivery',
        priority: 'SUCCESS',
        relatedEntityId: order.id,
        relatedEntityType: 'order',
      });
    }

    createNotification({
      userId: 'admin',
      role: 'admin',
      title: `Order #${order.id} Delivered`,
      message: `Order #${order.id} delivered by ${deliveryAgent?.name || order.deliveryBoyName || 'Delivery Partner'}.`,
      type: 'delivery',
      priority: 'INFO',
      relatedEntityId: order.id,
      relatedEntityType: 'order',
    });

    db.saveData();

    res.json({
      success: true,
      message: `Order #${order.id} delivered and verified successfully!`,
      order,
      payoutEarned: configuredPayout,
      walletBalance: deliveryAgent?.walletBalance,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
