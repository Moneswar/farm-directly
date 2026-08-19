import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { db, calculateFarmerLogistics, calculateCustomerSellingPrice, calculateWholesalePrice } from '../services/storage.js';
import { seededProducts } from '../services/productsSeed.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { IProduct, ProductCategory, ProductUnit } from '../models/index.js';
import { createNotification } from './notificationController.js';

/**
 * Handle Product Image Upload (File -> Static Uploads URL)
 */
export const uploadProductImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      message: 'Product image uploaded successfully!',
      imageUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Image upload failed.' });
  }
};

/**
 * Create a new product (Farmer)
 */
export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farmerId = req.user?.id;
    let farmerName = req.user?.name || 'Farmer';
    let farmerDistrict = 'Coimbatore';
    let farmerAddress = 'Pollachi Farm';

    // Get fresh farmer details from MongoDB / local store
    if (mongoose.connection.readyState === 1 && farmerId) {
      const u = await User.findOne({ id: farmerId }).lean().exec();
      if (u) {
        farmerName = u.name;
        farmerDistrict = u.district || farmerDistrict;
        farmerAddress = u.farmLocation || u.address || farmerAddress;
      }
    } else {
      const u = db.users.find((user) => user.id === farmerId);
      if (u) {
        farmerName = u.name;
        farmerDistrict = u.district || farmerDistrict;
        farmerAddress = u.farmLocation || u.address || farmerAddress;
      }
    }

    if (req.user?.role !== 'farmer' && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only registered farmers can upload products.' });
    }

    const {
      name,
      category,
      description,
      price,
      quantity,
      unit,
      organic,
      image,
      harvestDate,
      availabilityDate,
      expiryDate,
      location,
      stock,
    } = req.body;

    if (!name || !category || !price || stock === undefined || stock === '') {
      return res.status(400).json({ success: false, message: 'Name, category, price, and stock quantity are required.' });
    }

    const farmerLoc = location || farmerAddress || farmerDistrict || 'Pollachi';
    const farmerPriceVal = Number(req.body.farmerPrice || price);
    const logistics = calculateFarmerLogistics(farmerLoc, farmerPriceVal, (unit as string) || 'Kg', Number(quantity) || 1);

    const newProductId = 'prod_' + Date.now() + Math.random().toString(36).substring(2, 6);

    const newProduct: IProduct = {
      id: newProductId,
      farmerId: farmerId || 'usr_farmer1',
      farmerName,
      farmerDistrict,
      name,
      category: category as ProductCategory,
      description: description || '',
      price: Number(price),
      quantity: Number(quantity) || 1,
      unit: (unit as ProductUnit) || 'Kg',
      organic: Boolean(organic),
      image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
      harvestDate: harvestDate || new Date().toISOString().split('T')[0],
      availabilityDate: availabilityDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      location: farmerLoc,
      stock: Number(stock),
      status: 'Pending Approval',
      rating: 5.0,
      reviewsCount: 0,
      farmerPrice: farmerPriceVal,
      transportDistanceKm: logistics.transportDistanceKm,
      farmerToHubTransportCost: logistics.farmerToHubTransportCost,
      companyCommissionRate: logistics.companyCommissionRate,
      companyCommissionAmount: logistics.companyCommissionAmount,
      storageHandlingCost: logistics.storageHandlingCost,
      assignedHubId: logistics.assignedHubId,
      assignedHubName: logistics.assignedHubName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save in MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Product.create(newProduct);
      } catch (err) {
        console.warn('MongoDB Product.create fallback to db:', err);
      }
    }

    // Update local storage
    db.products.unshift(newProduct);

    // Trigger Farmer & Admin notifications safely
    createNotification({
      userId: farmerId,
      role: 'farmer',
      title: 'Product submitted for approval.',
      message: `Your produce "${name}" has been submitted for quality verification.`,
      type: 'product',
      priority: 'INFO',
      relatedEntityId: newProductId,
      relatedEntityType: 'product',
    });

    createNotification({
      userId: 'usr_admin',
      role: 'admin',
      title: 'New farmer product requires approval.',
      message: `${farmerName} submitted "${name}" (${category}) for approval.`,
      type: 'product',
      priority: 'INFO',
      relatedEntityId: newProductId,
      relatedEntityType: 'product',
    });
    db.saveData();

    return res.status(201).json({
      success: true,
      message: 'Product submitted successfully! Status: Pending Approval',
      product: newProduct,
    });
  } catch (error: any) {
    console.error('Create Product Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating product.' });
  }
};

/**
 * Get all products for Marketplace / Public view with filters
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, minPrice, maxPrice, organic, sortBy, farmerId, status, hubId } = req.query;

    let productsList: IProduct[] = [];
    if (mongoose.connection.readyState === 1) {
      const docs = await Product.find().lean().exec();
      productsList = docs.map((doc: any) => ({
        ...doc,
        id: doc.id || String(doc._id),
      })) as unknown as IProduct[];
    } else {
      productsList = (db.products || []).map((p: any) => ({
        ...p,
        id: p.id || String(p._id),
      }));
    }

    // If querying for a specific regional service hub, evaluate available stock strictly at that hub
    if (hubId) {
      const serviceHubId = String(hubId);
      productsList = productsList.map((p) => ({
        ...p,
        stock: db.getAvailableStockForProductAtHub(serviceHubId, p.id),
      }));
    }

    // Populate customer selling price & wholesale base price for each product dynamically
    productsList = productsList.map((p) => {
      const wholesaleInfo = calculateWholesalePrice(p, 10);
      return {
        ...p,
        price: calculateCustomerSellingPrice(p),
        wholesalePrice: wholesaleInfo.wholesalePrice,
        wholesaleBaseCost: wholesaleInfo.baseCost,
        minWholesaleQuantity: wholesaleInfo.minQuantity,
      };
    });

    let filtered = [...productsList];

    // Filter by approval status
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    } else {
      // Default marketplace view shows Approved items
      filtered = filtered.filter((p) => p.status === 'Approved');
    }

    if (farmerId) {
      filtered = filtered.filter((p) => p.farmerId === farmerId);
    }

    if (category && category !== 'All') {
      if (category === 'Organic') {
        filtered = filtered.filter((p) => p.category === 'Organic' || p.organic === true);
      } else {
        filtered = filtered.filter((p) => p.category === category);
      }
    }

    if (organic !== undefined && organic !== '') {
      const isOrg = organic === 'true' || organic === '1';
      filtered = filtered.filter((p) => p.organic === isOrg);
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.farmerName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (minPrice) {
      filtered = filtered.filter((p) => p.price >= Number(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter((p) => p.price <= Number(maxPrice));
    }

    // Sorting
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return res.json({ success: true, count: filtered.length, products: filtered });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get products created by the authenticated Farmer
 */
export const getFarmerProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const farmerId = req.user?.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let farmerProducts: IProduct[] = [];

    if (mongoose.connection.readyState === 1) {
      const docs = await Product.find({ farmerId }).lean().exec();
      farmerProducts = docs as unknown as IProduct[];
    } else {
      farmerProducts = db.products.filter((p) => p.farmerId === farmerId);
    }

    const pending = farmerProducts.filter((p) => p.status === 'Pending Approval');
    const approved = farmerProducts.filter((p) => p.status === 'Approved');
    const rejected = farmerProducts.filter((p) => p.status === 'Rejected');

    return res.json({
      success: true,
      all: farmerProducts,
      pending,
      approved,
      rejected,
      stats: {
        total: farmerProducts.length,
        approvedCount: approved.length,
        pendingCount: pending.length,
        rejectedCount: rejected.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single product by ID
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let product: IProduct | null = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await Product.findOne({ id }).lean().exec();
      if (doc) product = doc as unknown as IProduct;
    }
    if (!product) {
      product = db.products.find((p) => p.id === id) || null;
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product && ((product.category as string) === 'Natural Oils' || (product.image && product.image.includes('photo-1615485290382')))) {
      let freshImg = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600';
      if (product.name.includes('Groundnut')) freshImg = 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600';
      if (product.name.includes('Mustard') || product.name.includes('Castor') || product.name.includes('Almond') || product.name.includes('Flaxseed') || product.name.includes('Neem')) {
        freshImg = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600';
      }
      product = { ...product, image: freshImg };
    }

    if (product) {
      product = {
        ...product,
        price: calculateCustomerSellingPrice(product),
      };
    }

    const reviews = db.reviews.filter((r) => r.productId === id);

    return res.json({ success: true, product, reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing product (Farmer / Admin CRUD)
 */
export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let existingProduct: IProduct | null = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await Product.findOne({ id }).lean().exec();
      if (doc) existingProduct = doc as unknown as IProduct;
    }
    if (!existingProduct) {
      existingProduct = db.products.find((p) => p.id === id) || null;
    }

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (userRole !== 'admin' && existingProduct.farmerId !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this product.' });
    }

    const {
      name,
      category,
      description,
      price,
      quantity,
      unit,
      organic,
      image,
      harvestDate,
      expiryDate,
      location,
      stock,
    } = req.body;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      // Re-editing a rejected or modified product sends it back to Pending Approval for quality verification
      status: userRole === 'admin' ? existingProduct.status : 'Pending Approval',
    };

    if (name) updates.name = name;
    if (category) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = Number(price);
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (unit) updates.unit = unit;
    if (organic !== undefined) updates.organic = Boolean(organic);
    if (image) updates.image = image;
    if (harvestDate) updates.harvestDate = harvestDate;
    if (expiryDate) updates.expiryDate = expiryDate;
    if (location) updates.location = location;
    if (stock !== undefined) updates.stock = Number(stock);

    // Update in MongoDB Atlas
    if (mongoose.connection.readyState === 1) {
      await Product.findOneAndUpdate({ id }, { $set: updates }).exec();
    }

    // Update in local store
    const localIndex = db.products.findIndex((p) => p.id === id);
    if (localIndex !== -1) {
      db.products[localIndex] = { ...db.products[localIndex], ...updates };
      db.saveData();
    }

    // Get fresh updated object
    let freshProduct: IProduct | null = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await Product.findOne({ id }).lean().exec();
      if (doc) freshProduct = doc as unknown as IProduct;
    }
    if (!freshProduct && localIndex !== -1) {
      freshProduct = db.products[localIndex];
    }

    return res.json({
      success: true,
      message: 'Product updated successfully! Sent for Admin Review if modified.',
      product: freshProduct,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve or Reject Product (Admin Action)
 */
export const approveRejectProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, status, rejectionReason } = req.body; // 'approve' | 'reject' or status: 'Approved' | 'Rejected'

    let newStatus: 'Approved' | 'Rejected' = 'Approved';
    if (action === 'approve' || status === 'Approved' || status === 'approved') {
      newStatus = 'Approved';
    } else if (action === 'reject' || status === 'Rejected' || status === 'rejected') {
      newStatus = 'Rejected';
    } else {
      return res.status(400).json({ success: false, message: 'Action or status must be "approve"/"Approved" or "reject"/"Rejected"' });
    }

    const updates = {
      status: newStatus,
      rejectionReason: rejectionReason || '',
      updatedAt: new Date().toISOString(),
    };

    let updatedProduct: IProduct | null = null;

    if (mongoose.connection.readyState === 1) {
      const doc = await Product.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' }).lean().exec();
      if (doc) updatedProduct = doc as unknown as IProduct;
    }

    const localIndex = db.products.findIndex((p) => p.id === id);
    if (localIndex !== -1) {
      db.products[localIndex] = { ...db.products[localIndex], ...updates };
      updatedProduct = db.products[localIndex];
    }

    if (action === 'approve' && updatedProduct) {
      db.createCollectionTaskForProduct(updatedProduct);
    }
    db.saveData();

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Notify farmer safely via createNotification
    const isApproved = newStatus === 'Approved';
    createNotification({
      userId: updatedProduct.farmerId,
      role: 'farmer',
      title: isApproved ? 'Your product has been approved.' : 'Your product requires attention.',
      message: isApproved
        ? `Your produce "${updatedProduct.name}" has been approved for customer ordering.`
        : `Your produce "${updatedProduct.name}" requires attention and was marked as ${newStatus}.`,
      type: 'product',
      priority: isApproved ? 'SUCCESS' : 'WARNING',
      relatedEntityId: updatedProduct.id,
      relatedEntityType: 'product',
    });
    db.saveData();

    return res.json({
      success: true,
      message: `Product "${updatedProduct.name}" status updated to ${newStatus}.`,
      product: updatedProduct,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a product (Farmer CRUD / Admin)
 */
export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let targetProduct: IProduct | null = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await Product.findOne({ id }).lean().exec();
      if (doc) targetProduct = doc as unknown as IProduct;
    }
    if (!targetProduct) {
      targetProduct = db.products.find((p) => p.id === id) || null;
    }

    if (!targetProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (userRole !== 'admin' && targetProduct.farmerId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this product' });
    }

    // Delete in MongoDB Atlas
    if (mongoose.connection.readyState === 1) {
      await Product.deleteOne({ id }).exec();
    }

    // Delete in local store
    const localIndex = db.products.findIndex((p) => p.id === id);
    if (localIndex !== -1) {
      db.products.splice(localIndex, 1);
      db.saveData();
    }

    return res.json({ success: true, message: 'Product deleted successfully from database.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Preview wholesale pricing for a specific product and quantity
 */
export const getWholesalePricePreview = async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    let prod = db.products.find((p) => p.id === productId);
    if (!prod && mongoose.connection.readyState === 1) {
      prod = (await Product.findOne({ id: productId }).lean().exec()) as unknown as IProduct;
    }
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    const calculation = calculateWholesalePrice(prod, Number(quantity) || 10);
    return res.json({ success: true, product: prod, calculation });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

