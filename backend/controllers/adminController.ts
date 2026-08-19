import { Response } from 'express';
import mongoose from 'mongoose';
import { db } from '../services/storage.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ICoupon, IOffer } from '../models/index.js';

export const getAdminAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let users = db.users;
    let products = db.products;
    let orders = db.orders;

    if (mongoose.connection.readyState === 1) {
      try {
        const mongoUsers = await User.find().lean().exec();
        if (mongoUsers.length > 0) users = mongoUsers as any;

        const mongoProds = await Product.find().lean().exec();
        if (mongoProds.length > 0) products = mongoProds as any;

        const mongoOrders = await mongoose.connection.db!.collection('orders').find().toArray();
        if (mongoOrders.length > 0) orders = mongoOrders as any;
      } catch (err) {
        console.warn('MongoDB fetch analytics fallback to db:', err);
      }
    }

    const totalFarmers = users.filter((u) => u.role === 'farmer').length;
    const totalCustomers = users.filter((u) => u.role === 'customer').length;
    const totalDeliveryBoys = users.filter((u) => u.role === 'delivery').length;
    const totalShopkeepers = users.filter((u) => u.role === 'shopkeeper').length;
    const pendingFarmers = users.filter((u) => u.role === 'farmer' && u.status === 'pending').length;
    const pendingDelivery = users.filter((u) => u.role === 'delivery' && u.status === 'pending').length;

    const totalProducts = products.length;
    const pendingProducts = products.filter((p) => p.status === 'Pending Approval').length;
    const approvedProducts = products.filter((p) => p.status === 'Approved').length;
    const rejectedProducts = products.filter((p) => p.status === 'Rejected').length;

    // Date helpers
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.orderStatus === 'Delivered' || (o.orderStatus as string) === 'Completed').length;
    const pendingOrders = orders.filter((o) => ['Confirmed', 'Assigned', 'Hub Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery'].includes(o.orderStatus as string)).length;
    const cancelledOrders = orders.filter((o) => o.orderStatus === 'Cancelled').length;
    const selfPickupOrders = orders.filter((o) => o.deliveryMethod === 'self_pickup').length;
    const homeDeliveryOrders = orders.filter((o) => o.deliveryMethod === 'home_delivery').length;
    const readyForPickupOrders = orders.filter((o) => (o.orderStatus as string) === 'Ready for Pickup').length;
    const todayOrders = orders.filter((o) => o.placedAt && o.placedAt.startsWith(todayStr)).length;
    const monthlyOrders = orders.filter((o) => o.placedAt && o.placedAt >= monthStart).length;

    const validOrders = orders.filter((o) => o.orderStatus !== 'Cancelled');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const todayRevenue = validOrders.filter((o) => o.placedAt && o.placedAt.startsWith(todayStr)).reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const monthlyRevenue = validOrders.filter((o) => o.placedAt && o.placedAt >= monthStart).reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    // Operational KPIs
    const pendingCollections = (db.collections || []).filter((c: any) => ['Assigned', 'Pending'].includes(c.status)).length;
    const pendingReceipts = (db.collections || []).filter((c: any) => c.status === 'In Transit').length;
    const lowStockProducts = (db.inventory || []).filter((inv: any) => inv.quantityAvailable <= (inv.lowStockThreshold || 10) && inv.quantityAvailable > 0).length;
    const outOfStockProducts = (db.inventory || []).filter((inv: any) => inv.quantityAvailable === 0).length;
    const pendingReplenishments = (db.replenishmentRequests || []).filter((r: any) => r.status === 'Requested').length;
    const pendingTransfers = (db.transfers || []).filter((t: any) => ['Requested', 'Approved', 'Dispatched', 'In Transit'].includes(t.status)).length;
    const pendingDeliveryAssignments = orders.filter((o: any) => o.deliveryMethod === 'home_delivery' && !o.deliveryBoyId && !['Delivered', 'Cancelled', 'Completed'].includes(o.orderStatus as string)).length;
    const pendingPayouts = (db.payouts || []).filter((p: any) => p.status === 'Pending').length;

    let totalCustomerRevenue = 0;
    let totalFarmerProductCost = 0;
    let totalFarmerTransportCost = 0;
    let totalCompanyCommission = 0;
    let totalStorageHandling = 0;
    let totalRetailOrWholesaleMargin = 0;
    let totalDeliveryRevenue = 0;
    let totalDeliveryBoyPayout = 0;
    let totalCompanyGrossEarnings = 0;

    validOrders.forEach((o) => {
      totalCustomerRevenue += (o.grandTotal || 0);
      if (o.pricingSnapshot) {
        totalFarmerProductCost += o.pricingSnapshot.farmerProductCost || 0;
        totalFarmerTransportCost += o.pricingSnapshot.farmerTransportCost || 0;
        totalCompanyCommission += o.pricingSnapshot.companyCommission || 0;
        totalStorageHandling += o.pricingSnapshot.storageHandlingCost || 0;
        totalRetailOrWholesaleMargin += o.pricingSnapshot.retailOrWholesaleMargin || 0;
        totalDeliveryRevenue += o.pricingSnapshot.deliveryCharge || 0;
        totalDeliveryBoyPayout += o.pricingSnapshot.deliveryBoyPayout || 0;
        totalCompanyGrossEarnings += o.pricingSnapshot.companyGrossEarnings || 0;
      } else {
        const itemsTotal = o.subtotal || o.grandTotal || 0;
        const comm = Math.round(itemsTotal * 0.10 * 100) / 100;
        const margin = Math.round(itemsTotal * 0.13 * 100) / 100;
        const delCharge = o.deliveryCharge || 0;
        const payout = o.deliveryMethod === 'self_pickup' ? 0 : 60;
        totalCompanyCommission += comm;
        totalRetailOrWholesaleMargin += margin;
        totalDeliveryRevenue += delCharge;
        totalDeliveryBoyPayout += payout;
        totalCompanyGrossEarnings += Math.round((comm + margin + delCharge - payout) * 100) / 100;
      }
    });

    // Sales by Category
    const categorySales: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const cat = prod?.category || 'Vegetables';
          categorySales[cat] = (categorySales[cat] || 0) + (item.price || 0) * (item.quantity || 1);
        });
      }
    });

    // Recent 7 days revenue line chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = orders.filter((o) => o.placedAt && o.placedAt.startsWith(dateStr));
      const revenue = dayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      return {
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        revenue,
        ordersCount: dayOrders.length,
      };
    });

    res.json({
      success: true,
      analytics: {
        users: {
          farmers: totalFarmers,
          customers: totalCustomers,
          deliveryBoys: totalDeliveryBoys,
          shopkeepers: totalShopkeepers,
          pendingFarmers,
          pendingDelivery,
        },
        products: {
          total: totalProducts,
          pending: pendingProducts,
          approved: approvedProducts,
          rejected: rejectedProducts,
        },
        orders: {
          total: totalOrders,
          delivered: deliveredOrders,
          pending: pendingOrders,
          cancelled: cancelledOrders,
          selfPickup: selfPickupOrders,
          homeDelivery: homeDeliveryOrders,
          readyForPickup: readyForPickupOrders,
          today: todayOrders,
          monthly: monthlyOrders,
        },
        revenue: {
          total: Math.round(totalRevenue * 100) / 100,
          today: Math.round(todayRevenue * 100) / 100,
          monthly: Math.round(monthlyRevenue * 100) / 100,
        },
        totalRevenue,
        operations: {
          pendingCollections,
          pendingReceipts,
          lowStockProducts,
          outOfStockProducts,
          pendingReplenishments,
          pendingTransfers,
          pendingDeliveryAssignments,
          pendingPayouts,
        },
        financials: {
          totalCustomerRevenue: Math.round(totalCustomerRevenue * 100) / 100,
          totalFarmerProductCost: Math.round(totalFarmerProductCost * 100) / 100,
          totalFarmerTransportCost: Math.round(totalFarmerTransportCost * 100) / 100,
          totalCompanyCommission: Math.round(totalCompanyCommission * 100) / 100,
          totalStorageHandling: Math.round(totalStorageHandling * 100) / 100,
          totalRetailOrWholesaleMargin: Math.round(totalRetailOrWholesaleMargin * 100) / 100,
          totalDeliveryRevenue: Math.round(totalDeliveryRevenue * 100) / 100,
          totalDeliveryBoyPayout: Math.round(totalDeliveryBoyPayout * 100) / 100,
          totalCompanyGrossEarnings: Math.round(totalCompanyGrossEarnings * 100) / 100,
        },
        categorySales,
        last7Days,
        hubs: db.hubs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsersList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, status, search } = req.query;

    let usersList: any[] = [];
    if (mongoose.connection.readyState === 1) {
      const docs = await User.find().select('-passwordHash').lean().exec();
      usersList = docs;
    } else {
      usersList = db.users.map(({ passwordHash: _, ...u }) => u);
    }

    let filtered = [...usersList];

    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    if (status) {
      filtered = filtered.filter((u) => u.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q)) ||
          (u.district && u.district.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: filtered.length, users: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'blocked' | 'pending'

    if (!['approved', 'rejected', 'blocked', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    let updatedUser: any = null;

    if (mongoose.connection.readyState === 1) {
      const doc = await User.findOneAndUpdate(
        { id: userId },
        { $set: { status, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      ).select('-passwordHash').lean().exec();
      if (doc) updatedUser = doc;
    }

    const userIndex = db.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      db.users[userIndex].status = status;
      db.users[userIndex].updatedAt = new Date().toISOString();
      if (!updatedUser) updatedUser = db.users[userIndex];
      db.saveData();
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Notify user
    db.notifications.push({
      id: 'notif_' + Date.now(),
      userId: updatedUser.id,
      title: `Account Status Updated: ${status.toUpperCase()}`,
      message: `Your FarmDirect account status has been set to '${status}'.`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    db.saveData();

    res.json({ success: true, message: `User ${updatedUser.name} status updated to '${status}'`, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCoupons = async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, coupons: db.coupons });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, discountPercentage, maxDiscount, minOrderAmount, validUntil, description } = req.body;

    if (!code || !discountPercentage) {
      return res.status(400).json({ success: false, message: 'Coupon code and discount percentage are required.' });
    }

    const newCoupon: ICoupon = {
      id: 'cpn_' + Date.now(),
      code: code.toUpperCase().trim(),
      discountPercentage: Number(discountPercentage),
      maxDiscount: Number(maxDiscount) || 200,
      minOrderAmount: Number(minOrderAmount) || 300,
      validUntil: validUntil || '2026-12-31',
      description: description || `Get ${discountPercentage}% OFF`,
      isActive: true,
    };

    db.coupons.unshift(newCoupon);
    db.saveData();

    res.status(201).json({ success: true, message: 'Coupon created successfully!', coupon: newCoupon });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleCouponStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const coupon = db.coupons.find((c) => c.id === id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    coupon.isActive = !coupon.isActive;
    db.saveData();
    res.json({ success: true, message: `Coupon is now ${coupon.isActive ? 'Active' : 'Inactive'}`, coupon });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const idx = db.coupons.findIndex((c) => c.id === id);
    if (idx !== -1) {
      db.coupons.splice(idx, 1);
      db.saveData();
    }
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, offers: db.offers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOffer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, bannerImage, category, discountPercentage, validUntil, description } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Offer title is required.' });
    }

    const newOffer: IOffer = {
      id: 'off_' + Date.now(),
      title,
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1000',
      category: category || 'General',
      discountPercentage: Number(discountPercentage) || 15,
      validUntil: validUntil || '2026-12-31',
      description: description || '',
    };

    db.offers.unshift(newOffer);
    db.saveData();

    res.status(201).json({ success: true, message: 'Offer banner created!', offer: newOffer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOffer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const idx = db.offers.findIndex((o) => o.id === id);
    if (idx !== -1) {
      db.offers.splice(idx, 1);
      db.saveData();
    }
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeliverySettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { baseDeliveryCharge, freeDeliveryThreshold, gstPercentage, deliveryChargePerKm } = req.body;

    if (baseDeliveryCharge !== undefined) db.deliverySettings.baseDeliveryCharge = Number(baseDeliveryCharge);
    if (freeDeliveryThreshold !== undefined) db.deliverySettings.freeDeliveryThreshold = Number(freeDeliveryThreshold);
    if (gstPercentage !== undefined) db.deliverySettings.gstPercentage = Number(gstPercentage);
    if (deliveryChargePerKm !== undefined) db.deliverySettings.deliveryChargePerKm = Number(deliveryChargePerKm);

    db.saveData();

    res.json({ success: true, message: 'Delivery and GST settings updated!', settings: db.deliverySettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Centralized Pricing & Logistics Configuration
 */
export const getPricingConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.json({
      success: true,
      config: db.pricingConfig,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Centralized Pricing & Logistics Configuration (Admin Only)
 */
export const updatePricingConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      companyCommissionRate,
      retailMarginRate,
      wholesaleSlabs,
      farmerTransportRatePerKmKg,
      storageHandlingCost,
      deliveryDistanceSlabs,
      deliveryBoyDefaultPayout,
      defaultMinWholesaleQuantity,
      gstPercentage,
    } = req.body;

    // Validation
    if (companyCommissionRate !== undefined) {
      const rate = Number(companyCommissionRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return res.status(400).json({ success: false, message: 'Company commission rate must be between 0 and 1 (0% to 100%).' });
      }
      db.pricingConfig.companyCommissionRate = rate;
    }

    if (retailMarginRate !== undefined) {
      const margin = Number(retailMarginRate);
      if (isNaN(margin) || margin < 0 || margin > 1) {
        return res.status(400).json({ success: false, message: 'Retail margin rate must be between 0 and 1 (0% to 100%).' });
      }
      db.pricingConfig.retailMarginRate = margin;
    }

    if (wholesaleSlabs !== undefined) {
      if (!Array.isArray(wholesaleSlabs) || wholesaleSlabs.length === 0) {
        return res.status(400).json({ success: false, message: 'Wholesale slabs must be a non-empty array.' });
      }
      for (const slab of wholesaleSlabs) {
        if (slab.minQty < 0 || slab.marginRate < 0 || slab.marginRate > 1) {
          return res.status(400).json({ success: false, message: 'Invalid wholesale slab range or margin rate.' });
        }
      }
      db.pricingConfig.wholesaleSlabs = wholesaleSlabs;
    }

    if (farmerTransportRatePerKmKg !== undefined) {
      const rate = Number(farmerTransportRatePerKmKg);
      if (isNaN(rate) || rate < 0) {
        return res.status(400).json({ success: false, message: 'Transport rate per km/kg must be a non-negative number.' });
      }
      db.pricingConfig.farmerTransportRatePerKmKg = rate;
    }

    if (storageHandlingCost !== undefined) {
      const cost = Number(storageHandlingCost);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ success: false, message: 'Storage & handling cost must be a non-negative number.' });
      }
      db.pricingConfig.storageHandlingCost = cost;
    }

    if (deliveryDistanceSlabs !== undefined) {
      if (!Array.isArray(deliveryDistanceSlabs) || deliveryDistanceSlabs.length === 0) {
        return res.status(400).json({ success: false, message: 'Delivery distance slabs must be a non-empty array.' });
      }
      for (const slab of deliveryDistanceSlabs) {
        if (slab.minKm < 0 || slab.maxKm < slab.minKm || slab.charge < 0) {
          return res.status(400).json({ success: false, message: 'Invalid delivery distance slab range or charge.' });
        }
      }
      db.pricingConfig.deliveryDistanceSlabs = deliveryDistanceSlabs;
    }

    if (deliveryBoyDefaultPayout !== undefined) {
      const payout = Number(deliveryBoyDefaultPayout);
      if (isNaN(payout) || payout < 0) {
        return res.status(400).json({ success: false, message: 'Delivery partner default payout must be a non-negative number.' });
      }
      db.pricingConfig.deliveryBoyDefaultPayout = payout;
    }

    if (defaultMinWholesaleQuantity !== undefined) {
      const minQty = Number(defaultMinWholesaleQuantity);
      if (isNaN(minQty) || minQty < 1) {
        return res.status(400).json({ success: false, message: 'Default minimum wholesale quantity must be at least 1.' });
      }
      db.pricingConfig.defaultMinWholesaleQuantity = minQty;
    }

    if (gstPercentage !== undefined) {
      const gst = Number(gstPercentage);
      if (isNaN(gst) || gst < 0 || gst > 100) {
        return res.status(400).json({ success: false, message: 'GST percentage must be between 0% and 100%.' });
      }
      db.pricingConfig.gstPercentage = gst;
    }

    db.saveData();

    return res.json({
      success: true,
      message: '🎉 Centralized Pricing & Logistics Configuration saved successfully!',
      config: db.pricingConfig,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /admin/payments
 * Admin view of all payment transactions
 * Supports filter by status, search by orderId/customer/transactionId
 * Never exposes card numbers, CVV, or payment credentials
 */
export const getAdminPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, dateFrom, dateTo } = req.query;

    let payments: any[] = db.payments || [];

    // Apply status filter
    if (status && status !== 'all') {
      payments = payments.filter((p) => p.status === status);
    }

    // Apply date range filter
    if (dateFrom) {
      payments = payments.filter((p) => p.createdAt && p.createdAt >= String(dateFrom));
    }
    if (dateTo) {
      payments = payments.filter((p) => p.createdAt && p.createdAt <= String(dateTo) + 'T23:59:59');
    }

    // Apply search filter
    if (search) {
      const q = String(search).toLowerCase();
      payments = payments.filter(
        (p) =>
          (p.orderId && p.orderId.toLowerCase().includes(q)) ||
          (p.transactionId && p.transactionId.toLowerCase().includes(q)) ||
          (p.customerName && p.customerName.toLowerCase().includes(q)) ||
          (p.customerEmail && p.customerEmail.toLowerCase().includes(q))
      );
    }

    // Strip sensitive fields — never expose card/gateway credentials
    const safePayments = payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      transactionId: p.transactionId,
      customerId: p.customerId,
      customerName: p.customerName,
      customerEmail: p.customerEmail,
      amount: p.amount,
      currency: p.currency || 'INR',
      paymentMethod: p.paymentMethod,
      status: p.status,
      gatewayStatus: p.gatewayStatus,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    // Aggregated stats
    const allPayments = db.payments || [];
    const stats = {
      total: allPayments.length,
      success: allPayments.filter((p: any) => p.status === 'SUCCESS').length,
      pending: allPayments.filter((p: any) => p.status === 'PENDING').length,
      failed: allPayments.filter((p: any) => p.status === 'FAILED').length,
      cancelled: allPayments.filter((p: any) => p.status === 'CANCELLED').length,
      refunded: allPayments.filter((p: any) => p.status === 'REFUNDED').length,
      totalSuccessAmount: allPayments.filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + (p.amount || 0), 0),
    };

    res.json({ success: true, count: safePayments.length, payments: safePayments, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
