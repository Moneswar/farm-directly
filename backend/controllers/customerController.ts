import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { db } from '../services/storage.js';
import { Product } from '../models/Product.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ICartItem, IReview, ISupportTicket } from '../models/index.js';
import { seededProducts } from '../services/productsSeed.js';

export const getCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const cart = db.carts[userId] || [];
    res.json({ success: true, cart, settings: db.deliverySettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }
    const numQty = Number(quantity !== undefined ? quantity : 1);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number greater than 0.' });
    }
    const qty = numQty;

    // 1. Search in MongoDB if connected
    let product: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        product = await Product.findOne({ id: productId }).lean().exec();
        if (!product && /^[0-9a-fA-F]{24}$/.test(productId)) {
          product = await Product.findById(productId).lean().exec();
        }
      } catch (e) {
        console.error('Error querying Product from MongoDB:', e);
      }
    }

    // 2. Fallback to db.products or seededProducts
    if (!product) {
      product =
        db.products.find((p) => p.id === productId || String((p as any)._id) === productId) ||
        seededProducts.find((p) => p.id === productId || String((p as any)._id) === productId);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (!db.carts[userId]) {
      db.carts[userId] = [];
    }

    const existingIndex = db.carts[userId].findIndex((item) => item.productId === product!.id);
    const existingQty = existingIndex > -1 ? db.carts[userId][existingIndex].quantity : 0;
    const totalDesiredQty = existingQty + qty;

    if (product.stock < totalDesiredQty) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more. Available stock for "${product.name}" is ${product.stock} ${product.unit} (You already have ${existingQty} in cart).`,
      });
    }

    if (existingIndex > -1) {
      db.carts[userId][existingIndex].quantity = totalDesiredQty;
    } else {
      const newItem: ICartItem = {
        id: 'cart_' + Date.now(),
        productId: product.id,
        product,
        quantity: qty,
        priceAtAddition: product.price,
      };
      db.carts[userId].push(newItem);
    }

    db.saveData();

    res.json({ success: true, message: `Added ${product.name} to cart!`, cart: db.carts[userId] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartQuantity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productId, quantity } = req.body;
    const qty = Number(quantity);

    if (!db.carts[userId]) db.carts[userId] = [];

    if (isNaN(qty) || qty <= 0) {
      db.carts[userId] = db.carts[userId].filter((i) => i.productId !== productId);
    } else {
      const product =
        db.products.find((p) => p.id === productId) ||
        seededProducts.find((p) => p.id === productId);

      if (product && product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity (${qty} ${product.unit}) exceeds available stock (${product.stock} ${product.unit}).`,
        });
      }

      const item = db.carts[userId].find((i) => i.productId === productId);
      if (item) {
        item.quantity = qty;
      }
    }

    db.saveData();
    res.json({ success: true, cart: db.carts[userId] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please enter a coupon code.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const subtotalVal = Number(subtotal) || 0;

    const coupon = db.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);
    if (!coupon) {
      return res.status(404).json({ success: false, message: `Coupon code '${cleanCode}' is invalid or inactive.` });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (coupon.validUntil && coupon.validUntil < todayStr) {
      return res.status(400).json({ success: false, message: `Coupon code '${cleanCode}' has expired on ${coupon.validUntil}.` });
    }

    if (subtotalVal > 0 && subtotalVal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${cleanCode}' requires a minimum order amount of ₹${coupon.minOrderAmount}. Current subtotal: ₹${subtotalVal}.`,
      });
    }

    const calculatedDiscount = Math.round(
      Math.min((subtotalVal * coupon.discountPercentage) / 100, coupon.maxDiscount) * 100
    ) / 100;

    return res.json({
      success: true,
      message: `🎉 Coupon '${coupon.code}' applied! ${coupon.discountPercentage}% OFF (Max ₹${coupon.maxDiscount})`,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        maxDiscount: coupon.maxDiscount,
        minOrderAmount: coupon.minOrderAmount,
        validUntil: coupon.validUntil,
        description: coupon.description,
        calculatedDiscount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveCoupons = async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeCoupons = (db.coupons || [])
      .filter((c) => c.isActive && (!c.validUntil || c.validUntil >= todayStr))
      .map((c) => ({
        id: c.id,
        code: c.code,
        discountPercentage: c.discountPercentage,
        maxDiscount: c.maxDiscount,
        minOrderAmount: c.minOrderAmount,
        validUntil: c.validUntil,
        description: c.description,
      }));

    return res.json({ success: true, count: activeCoupons.length, coupons: activeCoupons });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const wishlist = db.wishlists[userId] || [];
    res.json({ success: true, wishlist });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productId } = req.body;
    if (!db.wishlists[userId]) db.wishlists[userId] = [];

    const index = db.wishlists[userId].indexOf(productId);
    let isWishlisted = false;

    if (index > -1) {
      db.wishlists[userId].splice(index, 1);
    } else {
      db.wishlists[userId].push(productId);
      isWishlisted = true;
    }

    db.saveData();

    res.json({ success: true, isWishlisted, wishlist: db.wishlists[userId] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rechargeWallet = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid recharge amount.' });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.walletBalance = (user.walletBalance || 0) + numAmount;
    user.updatedAt = new Date().toISOString();

    db.notifications.push({
      id: 'notif_' + Date.now(),
      userId,
      title: 'Wallet Recharged 💳',
      message: `₹${numAmount} successfully added to your wallet balance. New balance: ₹${user.walletBalance}`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    db.saveData();

    res.json({
      success: true,
      message: `🎉 Wallet successfully recharged with ₹${numAmount}!`,
      walletBalance: user.walletBalance,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const addReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.name || 'Customer';
    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, message: 'Product ID and rating (1-5) are required.' });
    }

    const product = db.products.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const newReview: IReview = {
      id: 'rev_' + Date.now(),
      productId,
      userId: userId!,
      userName,
      rating: Number(rating),
      comment: comment || 'Great farm product!',
      createdAt: new Date().toISOString(),
    };

    db.reviews.push(newReview);

    // Recalculate rating
    const prodReviews = db.reviews.filter((r) => r.productId === productId);
    const avgRating = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;

    product.rating = Math.round(avgRating * 10) / 10;
    product.reviewsCount = prodReviews.length;

    db.saveData();

    res.status(201).json({ success: true, message: 'Review submitted!', review: newReview, product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeatherAndCropSuggestions = async (req: Request, res: Response) => {
  try {
    const { district } = req.query;
    const distStr = (district as string) || 'Coimbatore';

    // Mock realistic weather data for Southern agricultural regions
    const weatherData = {
      location: `${distStr}, Tamil Nadu`,
      temperature: '29°C',
      condition: 'Partly Cloudy with Good Sunlight',
      humidity: '68%',
      rainfallProbability: '20%',
      windSpeed: '12 km/h',
      soilMoisture: 'Optimal for sowing',
      suggestedCrops: [
        { crop: 'Organic Tomatoes', season: 'Kharif/Rabi', expectedYield: '25 Tons/Acre', duration: '90 Days' },
        { crop: 'Millet & Sorghum', season: 'Summer', expectedYield: '1.8 Tons/Acre', duration: '75 Days' },
        { crop: 'Green Gram / Pulses', season: 'All Season', expectedYield: '800 Kg/Acre', duration: '60 Days' },
        { crop: 'Desi Cotton', season: 'Kharif', expectedYield: '1.2 Tons/Acre', duration: '140 Days' },
      ],
    };

    res.json({ success: true, weather: weatherData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
