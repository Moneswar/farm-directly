import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { db, normalizeHubId, INITIAL_HUBS } from '../services/storage.js';
import { DistributionHub } from '../models/Hub.js';
import { User } from '../models/User.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { IHub, IUser, IHubInventory, IHubTransfer, IHubTransferItem, IReplenishmentRequest, IDeliveryPayout } from '../models/index.js';
import { createNotification } from './notificationController.js';

/**
 * Get all hubs with live statistics (Admin Only)
 */
export const getAllHubs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let hubsList: any[] = [];
    let usersList: any[] = db.users;
    let ordersList: any[] = db.orders;

    if (mongoose.connection.readyState === 1) {
      try {
        const mongoHubs = await DistributionHub.find().lean().exec();
        if (mongoHubs.length > 0) hubsList = mongoHubs;

        const mongoUsers = await User.find().select('-passwordHash').lean().exec();
        if (mongoUsers.length > 0) usersList = mongoUsers;
      } catch (err) {
        console.warn('MongoDB fetch hubs fallback to storage:', err);
      }
    }

    if (hubsList.length === 0) {
      hubsList = db.hubs || [];
    }

    // Attach computed stats to each hub
    const hubsWithStats = hubsList.map((h: any) => {
      const hubId = h.id || String(h._id);
      const farmers = usersList.filter((u) => u.role === 'farmer' && u.distributionHubId === hubId);
      const deliveryAgents = usersList.filter((u) => u.role === 'delivery' && u.distributionHubId === hubId);
      const hubOrders = ordersList.filter((o) => o.hubId === hubId);

      const activeOrders = hubOrders.filter((o) =>
        ['Confirmed', 'Assigned', 'Pickup Complete', 'Arrived at Hub', 'Hub Processing', 'Out for Delivery'].includes(o.orderStatus)
      );
      const pendingOrders = hubOrders.filter((o) => o.orderStatus === 'Confirmed' || o.orderStatus === 'Pending');
      const completedOrders = hubOrders.filter((o) => o.orderStatus === 'Delivered');

      return {
        ...h,
        id: hubId,
        farmersCount: farmers.length,
        deliveryCount: deliveryAgents.length,
        activeOrdersCount: activeOrders.length,
        pendingOrdersCount: pendingOrders.length,
        completedOrdersCount: completedOrders.length,
      };
    });

    return res.json({ success: true, count: hubsWithStats.length, hubs: hubsWithStats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch hubs' });
  }
};

/**
 * Get active hubs for public / authenticated user drop-downs
 */
export const getActiveHubs = async (req: Request, res: Response) => {
  try {
    let hubsList: any[] = [];
    if (mongoose.connection.readyState === 1) {
      const docs = await DistributionHub.find({ isActive: true }).lean().exec();
      if (docs.length > 0) hubsList = docs;
    }

    if (hubsList.length === 0) {
      hubsList = (db.hubs || []).filter((h) => h.isActive !== false);
    }

    const cleaned = hubsList.map((h: any) => ({
      id: h.id || String(h._id),
      name: h.name,
      code: h.code,
      city: h.city,
      district: h.district,
      state: h.state,
      pincode: h.pincode,
      address: h.address,
      phone: h.phone,
      managerName: h.managerName,
      isActive: h.isActive !== false,
    }));

    return res.json({ success: true, count: cleaned.length, hubs: cleaned });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Hub Details by ID (Admin Only)
 */
export const getHubById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    let hub: any = null;
    let usersList: any[] = db.users;
    let ordersList: any[] = db.orders;

    if (mongoose.connection.readyState === 1) {
      const doc = await DistributionHub.findOne({ id }).lean().exec();
      if (doc) hub = doc;

      const mongoUsers = await User.find().select('-passwordHash').lean().exec();
      if (mongoUsers.length > 0) usersList = mongoUsers;
    }

    if (!hub) {
      hub = (db.hubs || []).find((h) => h.id === id) || null;
    }

    if (!hub) {
      return res.status(404).json({ success: false, message: 'Distribution Hub not found' });
    }

    const hubId = hub.id || String(hub._id);
    const assignedFarmers = usersList.filter((u) => u.role === 'farmer' && u.distributionHubId === hubId);
    const assignedDeliveryAgents = usersList.filter((u) => u.role === 'delivery' && u.distributionHubId === hubId);
    const hubOrders = ordersList.filter((o) => o.hubId === hubId);

    const activeOrders = hubOrders.filter((o) =>
      ['Confirmed', 'Assigned', 'Pickup Complete', 'Arrived at Hub', 'Hub Processing', 'Out for Delivery'].includes(o.orderStatus)
    );
    const completedOrders = hubOrders.filter((o) => o.orderStatus === 'Delivered');

    return res.json({
      success: true,
      hub: {
        ...hub,
        id: hubId,
      },
      farmers: assignedFarmers,
      deliveryAgents: assignedDeliveryAgents,
      activeOrders,
      completedOrders,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new Distribution Hub (Admin Only)
 */
export const createHub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      code,
      city,
      district,
      state,
      pincode,
      address,
      latitude,
      longitude,
      phone,
      managerName,
      isActive,
    } = req.body;

    if (!name || !code || !city || !district || !pincode || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, city, district, pincode, and address are required.',
      });
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Check code uniqueness
    let existingCode = false;
    if (mongoose.connection.readyState === 1) {
      const doc = await DistributionHub.findOne({ code: cleanCode }).lean().exec();
      if (doc) existingCode = true;
    }
    if (!existingCode) {
      existingCode = (db.hubs || []).some((h) => h.code.toUpperCase() === cleanCode);
    }

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Hub code '${cleanCode}' is already registered. Please use a unique hub code.`,
      });
    }

    const hubId = 'hub_' + cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newHub: IHub = {
      id: hubId,
      name,
      code: cleanCode,
      city,
      district,
      state: state || 'Tamil Nadu',
      pincode,
      address,
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      phone: phone || '',
      managerName: managerName || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (mongoose.connection.readyState === 1) {
      await DistributionHub.create(newHub);
    }

    const existsInDbIndex = (db.hubs || []).findIndex((h) => h.id === hubId);
    if (existsInDbIndex !== -1) {
      db.hubs[existsInDbIndex] = newHub;
    } else {
      db.hubs.push(newHub);
    }
    db.saveData();

    return res.status(201).json({
      success: true,
      message: `Distribution Hub '${name}' (${cleanCode}) created successfully!`,
      hub: newHub,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Distribution Hub (Admin Only)
 */
export const updateHub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      city,
      district,
      state,
      pincode,
      address,
      latitude,
      longitude,
      phone,
      managerName,
      isActive,
    } = req.body;

    let existingHub: any = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await DistributionHub.findOne({ id }).lean().exec();
      if (doc) existingHub = doc;
    }
    if (!existingHub) {
      existingHub = (db.hubs || []).find((h) => h.id === id) || null;
    }

    if (!existingHub) {
      return res.status(404).json({ success: false, message: 'Distribution Hub not found.' });
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (code) updates.code = String(code).trim().toUpperCase();
    if (city) updates.city = city;
    if (district) updates.district = district;
    if (state) updates.state = state;
    if (pincode) updates.pincode = pincode;
    if (address) updates.address = address;
    if (latitude !== undefined) updates.latitude = Number(latitude);
    if (longitude !== undefined) updates.longitude = Number(longitude);
    if (phone !== undefined) updates.phone = phone;
    if (managerName !== undefined) updates.managerName = managerName;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (mongoose.connection.readyState === 1) {
      await DistributionHub.findOneAndUpdate({ id }, { $set: updates }).exec();
    }

    const index = (db.hubs || []).findIndex((h) => h.id === id);
    if (index !== -1) {
      db.hubs[index] = { ...db.hubs[index], ...updates };
      db.saveData();
    }

    return res.json({
      success: true,
      message: `Distribution Hub '${updates.name || existingHub.name}' updated successfully!`,
      hub: { ...existingHub, ...updates },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle Hub Active Status (Admin Only)
 */
export const toggleHubStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    let existingHub: any = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await DistributionHub.findOne({ id }).lean().exec();
      if (doc) existingHub = doc;
    }
    if (!existingHub) {
      existingHub = (db.hubs || []).find((h) => h.id === id) || null;
    }

    if (!existingHub) {
      return res.status(404).json({ success: false, message: 'Distribution Hub not found.' });
    }

    const newStatus = !existingHub.isActive;

    if (mongoose.connection.readyState === 1) {
      await DistributionHub.findOneAndUpdate(
        { id },
        { $set: { isActive: newStatus, updatedAt: new Date().toISOString() } }
      ).exec();
    }

    const index = (db.hubs || []).findIndex((h) => h.id === id);
    if (index !== -1) {
      db.hubs[index].isActive = newStatus;
      db.hubs[index].updatedAt = new Date().toISOString();
      db.saveData();
    }

    return res.json({
      success: true,
      message: `Hub '${existingHub.name}' status set to ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`,
      isActive: newStatus,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign Farmer or Delivery Partner to a Distribution Hub (Admin Only)
 */
export const assignUserHub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { hubId } = req.body; // Can be string or empty string to unassign

    let targetUser: any = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await User.findOne({ id: userId }).lean().exec();
      if (doc) targetUser = doc;
    }
    if (!targetUser) {
      targetUser = db.users.find((u) => u.id === userId) || null;
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!['farmer', 'delivery'].includes(targetUser.role)) {
      return res.status(400).json({
        success: false,
        message: 'Only Farmer and Delivery Agent user roles can be assigned to a Distribution Hub.',
      });
    }

    let hubName = '';
    if (hubId) {
      let targetHub: any = null;
      if (mongoose.connection.readyState === 1) {
        const doc = await DistributionHub.findOne({ id: hubId }).lean().exec();
        if (doc) targetHub = doc;
      }
      if (!targetHub) {
        targetHub = (db.hubs || []).find((h) => h.id === hubId) || null;
      }

      if (!targetHub) {
        return res.status(404).json({ success: false, message: 'Selected Distribution Hub does not exist.' });
      }

      if (targetHub.isActive === false) {
        return res.status(400).json({
          success: false,
          message: `Cannot assign user to '${targetHub.name}' because this hub is currently INACTIVE. Please activate the hub first.`,
        });
      }

      hubName = targetHub.name;
    }

    const updates = {
      distributionHubId: hubId || '',
      distributionHubName: hubName,
      updatedAt: new Date().toISOString(),
    };

    if (mongoose.connection.readyState === 1) {
      await User.findOneAndUpdate({ id: userId }, { $set: updates }).exec();
    }

    const uIndex = db.users.findIndex((u) => u.id === userId);
    if (uIndex !== -1) {
      db.users[uIndex].distributionHubId = updates.distributionHubId;
      db.users[uIndex].distributionHubName = updates.distributionHubName;
      db.users[uIndex].updatedAt = updates.updatedAt;
    }

    // Push notification to user
    db.notifications.push({
      id: 'notif_' + Date.now(),
      userId: targetUser.id,
      title: hubName ? 'Distribution Hub Assigned 🏭' : 'Distribution Hub Unassigned',
      message: hubName
        ? `You have been assigned to '${hubName}' as your primary operating regional hub.`
        : `Your regional distribution hub assignment has been updated by Admin.`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    db.saveData();

    return res.json({
      success: true,
      message: hubName
        ? `User '${targetUser.name}' assigned to ${hubName} successfully.`
        : `Hub assignment removed for '${targetUser.name}'.`,
      user: {
        ...targetUser,
        ...updates,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Hub Inventory List (Admin/Hub Manager)
 */
export const getHubInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId } = req.query;
    let records = db.inventory;

    if (hubId) {
      const hubLower = normalizeHubId(String(hubId));
      records = records.filter((inv) => normalizeHubId(inv.hubId) === hubLower);
    }

    return res.json({
      success: true,
      inventory: records,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Inventory Movement Audit Logs (Admin Only)
 */
export const getInventoryMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId, productId } = req.query;
    let movements = db.inventoryMovements;

    if (hubId) {
      const hubLower = normalizeHubId(String(hubId));
      movements = movements.filter((m) => normalizeHubId(m.hubId) === hubLower);
    }
    if (productId) {
      movements = movements.filter((m) => m.productId === String(productId));
    }

    return res.json({
      success: true,
      movements,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Receive Farmer Product Batch into Hub Inventory (Admin / Hub Operator)
 */
export const receiveInventoryBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId } = req.params;
    const { productId, quantity } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity required.' });
    }

    const prod = db.products.find((p) => p.id === productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const targetHubId = normalizeHubId(hubId || prod.assignedHubId || 'hub_cbe');
    const existing = db.inventory.find((inv) => normalizeHubId(inv.hubId) === targetHubId && inv.productId === prod.id);

    if (existing) {
      existing.quantityReceived += qty;
      existing.quantityAvailable += qty;
      existing.updatedAt = new Date().toISOString();
      existing.status = 'available';
    } else {
      const batchId = `${targetHubId.toUpperCase().replace('HUB_', '')}-${prod.name.substring(0, 3).toUpperCase()}-2026-${String(db.inventory.length + 1).padStart(3, '0')}`;
      const newInv: IHubInventory = {
        id: `inv_${prod.id}_${targetHubId}`,
        hubId: targetHubId,
        productId: prod.id,
        productName: prod.name,
        farmerId: prod.farmerId || 'usr_farmer1',
        farmerName: prod.farmerName || 'Ramesh Kumar',
        batchId,
        quantityReceived: qty,
        quantityAvailable: qty,
        quantityReserved: 0,
        quantitySold: 0,
        unit: prod.unit || 'Kg',
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'available',
      };
      db.inventory.push(newInv);
    }

    // Sync product stock
    prod.stock = db.getAvailableStockForProductAtHub(targetHubId, prod.id);

    db.inventoryMovements.push({
      id: 'mov_' + Math.floor(100000 + Math.random() * 900000),
      hubId: targetHubId,
      productId: prod.id,
      farmerId: prod.farmerId || 'usr_farmer1',
      batchId: existing?.batchId || `${targetHubId.toUpperCase()}-BATCH`,
      type: 'RECEIVED',
      quantity: qty,
      timestamp: new Date().toISOString(),
      notes: `Received batch of ${qty} ${prod.unit} into hub inventory`,
    });

    db.saveData();

    return res.json({
      success: true,
      message: `Successfully received ${qty} ${prod.unit} of "${prod.name}" into Hub Inventory. Available stock updated!`,
      availableStock: prod.stock,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Farmer Collections list (Admin / Delivery Agent / Farmer)
 */
export const getFarmerCollections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId, farmerId, deliveryBoyId, status } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    let list = db.collections;

    if (userRole === 'farmer') {
      list = list.filter((c) => c.farmerId === userId);
    } else if (userRole === 'delivery') {
      const deliveryUser = db.users.find((u) => u.id === userId);
      const deliveryHubId = normalizeHubId(
        deliveryUser?.assignedHubId || deliveryUser?.distributionHubId,
        deliveryUser?.district,
        deliveryUser?.pincode
      );
      list = list.filter((c) => {
        const colHubId = normalizeHubId(c.hubId);
        const isAssignedToMe = c.deliveryBoyId === userId;
        const isUnassignedInMyHub = (!c.deliveryBoyId || c.deliveryBoyId === '') && colHubId === deliveryHubId;
        return isAssignedToMe || isUnassignedInMyHub;
      });
    }

    if (hubId && userRole === 'admin') {
      const hubLower = normalizeHubId(String(hubId));
      list = list.filter((c) => normalizeHubId(c.hubId) === hubLower);
    }
    if (farmerId && userRole === 'admin') {
      list = list.filter((c) => c.farmerId === String(farmerId));
    }
    if (deliveryBoyId && userRole === 'admin') {
      list = list.filter((c) => c.deliveryBoyId === String(deliveryBoyId));
    }
    if (status) {
      list = list.filter((c) => c.status === String(status));
    }

    return res.json({
      success: true,
      collections: list,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign Delivery Partner to Farmer Collection Task (Admin Only)
 */
export const assignCollectionDeliveryBoy = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId } = req.body;

    const colIndex = db.collections.findIndex((c) => c.id === id);
    if (colIndex === -1) {
      return res.status(404).json({ success: false, message: 'Collection task not found.' });
    }

    const collection = db.collections[colIndex];
    const deliveryBoy = db.users.find((u) => u.id === deliveryBoyId && u.role === 'delivery');
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Delivery Partner not found.' });
    }

    // HUB MATCH GUARD
    const deliveryBoyHubId = normalizeHubId(deliveryBoy.assignedHubId || deliveryBoy.distributionHubId, deliveryBoy.district, deliveryBoy.pincode);
    const collectionHubId = normalizeHubId(collection.hubId);

    if (deliveryBoyHubId !== collectionHubId) {
      return res.status(400).json({
        success: false,
        message: `Delivery Partner "${deliveryBoy.name}" belongs to a different distribution hub. Cannot assign collection task for ${collection.hubName}.`,
      });
    }

    collection.deliveryBoyId = deliveryBoy.id;
    collection.deliveryBoyName = deliveryBoy.name;
    collection.deliveryBoyPhone = deliveryBoy.phone || '+91 98765 43213';
    collection.status = 'Collection Assigned';
    collection.updatedAt = new Date().toISOString();

    db.collections[colIndex] = collection;

    // Notify delivery boy of new farmer collection assignment
    createNotification({
      userId: deliveryBoy.id,
      role: 'delivery',
      title: 'Farmer collection assigned.',
      message: `Collection task #${id} assigned to you. Pick up ${collection.productName} from ${collection.farmerName}.`,
      type: 'delivery',
      priority: 'URGENT',
      relatedEntityId: id,
      relatedEntityType: 'collection',
    });

    db.saveData();

    return res.json({
      success: true,
      message: `Assigned collection task #${id} to ${deliveryBoy.name} successfully.`,
      collection,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Collection Status (Delivery Partner Action)
 */
export const updateCollectionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const colIndex = db.collections.findIndex((c) => c.id === id);
    if (colIndex === -1) {
      return res.status(404).json({ success: false, message: 'Collection task not found.' });
    }

    const collection = db.collections[colIndex];
    if (req.user?.role === 'customer' || req.user?.role === 'farmer') {
      return res.status(403).json({ success: false, message: 'Not authorized to update collection status.' });
    }

    collection.status = status;
    collection.updatedAt = new Date().toISOString();
    if (status === 'Collected') {
      collection.collectedAt = new Date().toISOString();
      collection.status = 'In Transit';
    }

    db.collections[colIndex] = collection;

    // Notify farmer when their produce is collected / in transit
    if (collection.status === 'In Transit') {
      createNotification({
        userId: collection.farmerId,
        role: 'farmer',
        title: 'Your produce has been collected.',
        message: `${collection.productName} (${collection.expectedQuantity} ${collection.unit}) collected from your farm and is now in transit to ${collection.hubName}.`,
        type: 'collection',
        priority: 'INFO',
        relatedEntityId: id,
        relatedEntityType: 'collection',
      });
    }

    db.saveData();

    return res.json({
      success: true,
      message: `Collection #${id} status updated to '${collection.status}'.`,
      collection,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Confirm Physical Receipt of Farmer Collection at Hub (Admin / Hub Operator Action)
 */
export const receiveCollectionAtHub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { receivedQuantity, notes } = req.body;

    const colIndex = db.collections.findIndex((c) => c.id === id);
    if (colIndex === -1) {
      return res.status(404).json({ success: false, message: 'Collection task not found.' });
    }

    const collection = db.collections[colIndex];

    // DUPLICATE RECEIPT GUARD
    if (collection.status === 'Received at Hub') {
      return res.status(400).json({ success: false, message: 'Shipment has already been received into Hub Inventory.' });
    }

    const actualQty = Number(receivedQuantity) > 0 ? Number(receivedQuantity) : collection.expectedQuantity;
    const discrepancy = Math.max(0, collection.expectedQuantity - actualQty);

    collection.receivedQuantity = actualQty;
    collection.discrepancyQuantity = discrepancy;
    collection.status = 'Received at Hub';
    collection.receivedAt = new Date().toISOString();
    collection.notes = notes || (discrepancy > 0 ? `${discrepancy} ${collection.unit} shortage logged` : 'Received in full');

    const targetHubId = normalizeHubId(collection.hubId);
    const prod = db.products.find((p) => p.id === collection.productId);

    if (prod) {
      const batchSeq = String(db.inventory.length + 1).padStart(3, '0');
      const batchId = `${targetHubId.toUpperCase().replace('HUB_', '')}-${prod.name.substring(0, 3).toUpperCase()}-2026-${batchSeq}`;
      collection.batchId = batchId;

      const existingInv = db.inventory.find((inv) => normalizeHubId(inv.hubId) === targetHubId && inv.productId === prod.id);
      if (existingInv) {
        existingInv.quantityReceived += actualQty;
        existingInv.quantityAvailable += actualQty;
        existingInv.updatedAt = new Date().toISOString();
        existingInv.status = 'available';
      } else {
        db.inventory.push({
          id: `inv_${prod.id}_${targetHubId}`,
          hubId: targetHubId,
          productId: prod.id,
          productName: prod.name,
          farmerId: collection.farmerId,
          farmerName: collection.farmerName,
          batchId,
          quantityReceived: actualQty,
          quantityAvailable: actualQty,
          quantityReserved: 0,
          quantitySold: 0,
          unit: collection.unit,
          receivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'available',
        });
      }

      // Sync available stock for product
      prod.stock = db.getAvailableStockForProductAtHub(targetHubId, prod.id);

      db.inventoryMovements.push({
        id: 'mov_' + Math.floor(100000 + Math.random() * 900000),
        hubInventoryId: `inv_${prod.id}_${targetHubId}`,
        hubId: targetHubId,
        productId: prod.id,
        farmerId: collection.farmerId,
        batchId,
        type: 'RECEIVED',
        quantity: actualQty,
        timestamp: new Date().toISOString(),
        notes: `Physical receipt of collection #${id}. Received: ${actualQty} ${collection.unit}` + (discrepancy > 0 ? ` (${discrepancy} ${collection.unit} shortage)` : ''),
      });
    }

    db.collections[colIndex] = collection;

    // Notify farmer that their produce arrived at hub
    createNotification({
      userId: collection.farmerId,
      role: 'farmer',
      title: 'Your produce has been received at the hub.',
      message: `${actualQty} ${collection.unit} of ${collection.productName} received at ${collection.hubName}.${discrepancy > 0 ? ` Note: ${discrepancy} ${collection.unit} shortage recorded.` : ''}`,
      type: 'collection',
      priority: 'SUCCESS',
      relatedEntityId: id,
      relatedEntityType: 'collection',
    });

    db.saveData();

    return res.json({
      success: true,
      message: `Physical receipt confirmed! Added ${actualQty} ${collection.unit} to Hub Inventory.` + (discrepancy > 0 ? ` Shortage of ${discrepancy} ${collection.unit} logged.` : ''),
      collection,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Hub Transfers List (Admin Only)
 */
export const getHubTransfers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourceHubId, destinationHubId, status } = req.query;
    let list = db.transfers;

    if (sourceHubId) {
      const sourceLower = normalizeHubId(String(sourceHubId));
      list = list.filter((t) => normalizeHubId(t.sourceHubId) === sourceLower);
    }
    if (destinationHubId) {
      const destLower = normalizeHubId(String(destinationHubId));
      list = list.filter((t) => normalizeHubId(t.destinationHubId) === destLower);
    }
    if (status) {
      list = list.filter((t) => t.status === String(status));
    }

    return res.json({
      success: true,
      transfers: list,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create Inter-Hub Transfer Request (Admin Only)
 */
export const createHubTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourceHubId, destinationHubId, productId, quantity, notes } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid transfer quantity required.' });
    }

    if (normalizeHubId(sourceHubId) === normalizeHubId(destinationHubId)) {
      return res.status(400).json({ success: false, message: 'Source and Destination Hubs cannot be identical.' });
    }

    const prod = db.products.find((p) => p.id === productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const availableStock = db.getAvailableStockForProductAtHub(sourceHubId, productId);
    if (availableStock < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock at source hub. Available: ${availableStock} ${prod.unit}, Requested: ${qty} ${prod.unit}`,
      });
    }

    const sourceHub = INITIAL_HUBS.find((h) => h.id.toLowerCase() === sourceHubId.toLowerCase()) || { name: sourceHubId };
    const destHub = INITIAL_HUBS.find((h) => h.id.toLowerCase() === destinationHubId.toLowerCase()) || { name: destinationHubId };

    const trfId = 'TRF-' + Math.floor(1000 + Math.random() * 9000);
    const newTransfer: IHubTransfer = {
      id: trfId,
      sourceHubId: normalizeHubId(sourceHubId),
      sourceHubName: sourceHub.name,
      destinationHubId: normalizeHubId(destinationHubId),
      destinationHubName: destHub.name,
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unit: prod.unit || 'Kg',
        },
      ],
      status: 'Requested',
      requestedBy: req.user?.name || 'Admin',
      requestedAt: new Date().toISOString(),
      notes: notes || '',
    };

    db.transfers.unshift(newTransfer);

    // Notify admin of new hub transfer request
    createNotification({
      userId: 'usr_admin',
      role: 'admin',
      title: 'New hub-to-hub transfer request created.',
      message: `Transfer #${trfId}: ${qty} ${prod.unit} of ${prod.name} from ${sourceHub.name} to ${destHub.name}. Awaiting approval.`,
      type: 'inventory',
      priority: 'INFO',
      relatedEntityId: trfId,
      relatedEntityType: 'transfer',
    });

    db.saveData();

    return res.status(201).json({
      success: true,
      message: `Hub transfer request #${trfId} created successfully (${qty} ${prod.unit} of ${prod.name} from ${sourceHub.name} to ${destHub.name}).`,
      transfer: newTransfer,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve Hub Transfer Request (Admin Only)
 */
export const approveHubTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const trfIndex = db.transfers.findIndex((t) => t.id === id);

    if (trfIndex === -1) {
      return res.status(404).json({ success: false, message: 'Transfer request not found.' });
    }

    const transfer = db.transfers[trfIndex];
    if (transfer.status !== 'Requested') {
      return res.status(400).json({ success: false, message: `Cannot approve transfer with status '${transfer.status}'.` });
    }

    const item = transfer.items[0];
    const availableStock = db.getAvailableStockForProductAtHub(transfer.sourceHubId, item.productId);
    if (availableStock < item.quantity) {
      return res.status(400).json({ success: false, message: `Insufficient available stock at source hub to approve transfer.` });
    }

    // Reserve stock at source hub for transfer
    db.reserveStockAtHub(transfer.sourceHubId, item.productId, item.quantity, transfer.id);

    transfer.status = 'Approved';
    transfer.approvedBy = req.user?.name || 'Admin';
    transfer.approvedAt = new Date().toISOString();

    db.transfers[trfIndex] = transfer;
    db.saveData();

    return res.json({
      success: true,
      message: `Transfer #${id} approved! Reserved ${item.quantity} ${item.unit} at ${transfer.sourceHubName}.`,
      transfer,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Dispatch Hub Transfer (Admin / Transport Officer Action)
 */
export const dispatchHubTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const trfIndex = db.transfers.findIndex((t) => t.id === id);

    if (trfIndex === -1) {
      return res.status(404).json({ success: false, message: 'Transfer request not found.' });
    }

    const transfer = db.transfers[trfIndex];
    if (transfer.status !== 'Approved') {
      return res.status(400).json({ success: false, message: `Transfer must be 'Approved' before dispatching.` });
    }

    const item = transfer.items[0];
    // Dispatch reserved stock from source hub
    db.dispatchStockAtHub(transfer.sourceHubId, item.productId, item.quantity, transfer.id);

    transfer.status = 'In Transit';
    transfer.dispatchedAt = new Date().toISOString();

    db.transfers[trfIndex] = transfer;
    db.saveData();

    return res.json({
      success: true,
      message: `Transfer #${id} dispatched from ${transfer.sourceHubName}! Shipment is now In Transit to ${transfer.destinationHubName}.`,
      transfer,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Confirm Physical Receipt of Inter-Hub Transfer at Destination Hub (Admin / Hub Operator)
 */
export const receiveHubTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { receivedQuantity, notes } = req.body;

    const trfIndex = db.transfers.findIndex((t) => t.id === id);
    if (trfIndex === -1) {
      return res.status(404).json({ success: false, message: 'Transfer request not found.' });
    }

    const transfer = db.transfers[trfIndex];

    // DUPLICATE RECEIPT GUARD
    if (transfer.status === 'Completed' || transfer.status === 'Received') {
      return res.status(400).json({ success: false, message: 'Transfer shipment has already been received at destination hub.' });
    }

    const item = transfer.items[0];
    const actualQty = Number(receivedQuantity) > 0 ? Number(receivedQuantity) : item.quantity;
    const discrepancy = Math.max(0, item.quantity - actualQty);

    transfer.discrepancyQuantity = discrepancy;
    transfer.status = 'Completed';
    transfer.receivedAt = new Date().toISOString();
    if (notes) transfer.notes = notes;

    const destHubId = normalizeHubId(transfer.destinationHubId);
    const prod = db.products.find((p) => p.id === item.productId);

    if (prod) {
      const batchSeq = String(db.inventory.length + 1).padStart(3, '0');
      const batchId = `${destHubId.toUpperCase().replace('HUB_', '')}-TRF-${prod.name.substring(0, 3).toUpperCase()}-2026-${batchSeq}`;

      const existingInv = db.inventory.find((inv) => normalizeHubId(inv.hubId) === destHubId && inv.productId === prod.id);
      if (existingInv) {
        existingInv.quantityReceived += actualQty;
        existingInv.quantityAvailable += actualQty;
        existingInv.updatedAt = new Date().toISOString();
        existingInv.status = 'available';
      } else {
        db.inventory.push({
          id: `inv_${prod.id}_${destHubId}`,
          hubId: destHubId,
          productId: prod.id,
          productName: prod.name,
          farmerId: prod.farmerId || 'usr_farmer1',
          farmerName: prod.farmerName || 'FarmDirect Supplier',
          batchId,
          quantityReceived: actualQty,
          quantityAvailable: actualQty,
          quantityReserved: 0,
          quantitySold: 0,
          unit: item.unit,
          receivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'available',
        });
      }

      db.inventoryMovements.push({
        id: 'mov_' + Math.floor(100000 + Math.random() * 900000),
        hubInventoryId: `inv_${prod.id}_${destHubId}`,
        hubId: destHubId,
        productId: prod.id,
        farmerId: prod.farmerId || 'usr_farmer1',
        batchId,
        type: 'TRANSFER_RECEIVED',
        quantity: actualQty,
        timestamp: new Date().toISOString(),
        notes: `Physical receipt of transfer #${id} from ${transfer.sourceHubName}. Received: ${actualQty} ${item.unit}` + (discrepancy > 0 ? ` (${discrepancy} ${item.unit} shortage)` : ''),
      });
    }

    db.transfers[trfIndex] = transfer;
    db.saveData();

    return res.json({
      success: true,
      message: `Inter-hub transfer #${id} completed! Added ${actualQty} ${item.unit} to ${transfer.destinationHubName} Inventory.` + (discrepancy > 0 ? ` Shortage of ${discrepancy} ${item.unit} recorded.` : ''),
      transfer,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Hub Replenishment Requests List (Admin Only)
 */
export const getReplenishmentRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId, status } = req.query;
    let list = db.replenishmentRequests;

    if (hubId) {
      const hubLower = normalizeHubId(String(hubId));
      list = list.filter((r) => normalizeHubId(r.hubId) === hubLower);
    }
    if (status) {
      list = list.filter((r) => r.status === String(status));
    }

    return res.json({
      success: true,
      replenishments: list,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create Hub Stock Replenishment Request (Admin Only)
 */
export const createReplenishmentRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId, productId, requestedQuantity, sourceType, sourceHubId, notes } = req.body;

    const qty = Number(requestedQuantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Requested replenishment quantity must be greater than zero.' });
    }

    const prod = db.products.find((p) => p.id === productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const targetHubId = normalizeHubId(hubId);
    const targetHub = INITIAL_HUBS.find((h) => h.id.toLowerCase() === targetHubId.toLowerCase()) || { name: targetHubId };

    const currentAvail = db.getAvailableStockForProductAtHub(targetHubId, productId);
    const threshold = 10;

    if (sourceType === 'HUB_TRANSFER') {
      if (!sourceHubId) {
        return res.status(400).json({ success: false, message: 'Source Hub is required for HUB_TRANSFER replenishment.' });
      }
      if (normalizeHubId(sourceHubId) === targetHubId) {
        return res.status(400).json({ success: false, message: 'Source Hub cannot be identical to Destination Hub.' });
      }
      const sourceAvail = db.getAvailableStockForProductAtHub(sourceHubId, productId);
      if (sourceAvail < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock at source hub. Available: ${sourceAvail} ${prod.unit}, Requested: ${qty} ${prod.unit}`,
        });
      }
    }

    const sourceHub = sourceHubId
      ? INITIAL_HUBS.find((h) => h.id.toLowerCase() === sourceHubId.toLowerCase()) || { name: sourceHubId }
      : undefined;

    const reqId = 'REP-' + Math.floor(1000 + Math.random() * 9000);
    const newReq: IReplenishmentRequest = {
      id: reqId,
      hubId: targetHubId,
      hubName: targetHub.name,
      productId: prod.id,
      productName: prod.name,
      requestedQuantity: qty,
      unit: prod.unit || 'Kg',
      currentAvailableQuantity: currentAvail,
      lowStockThreshold: threshold,
      sourceType: sourceType === 'HUB_TRANSFER' ? 'HUB_TRANSFER' : 'FARMER_SUPPLY',
      sourceHubId: sourceHubId ? normalizeHubId(sourceHubId) : undefined,
      sourceHubName: sourceHub?.name,
      status: 'REQUESTED',
      requestedBy: req.user?.name || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: notes || '',
    };

    db.replenishmentRequests.unshift(newReq);

    // Notify admin of new replenishment request
    createNotification({
      userId: 'usr_admin',
      role: 'admin',
      title: 'New stock replenishment request created.',
      message: `Replenishment #${reqId}: ${qty} ${prod.unit} of ${prod.name} requested for ${targetHub.name}.`,
      type: 'inventory',
      priority: 'WARNING',
      relatedEntityId: reqId,
      relatedEntityType: 'replenishment',
    });

    db.saveData();

    return res.status(201).json({
      success: true,
      message: `Stock replenishment request #${reqId} created for ${targetHub.name} (${qty} ${prod.unit} of ${prod.name}).`,
      replenishment: newReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve Hub Replenishment Request (Admin Only)
 */
export const approveReplenishmentRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reqIndex = db.replenishmentRequests.findIndex((r) => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ success: false, message: 'Replenishment request not found.' });
    }

    const repReq = db.replenishmentRequests[reqIndex];
    if (repReq.status !== 'REQUESTED') {
      return res.status(400).json({ success: false, message: `Replenishment request is already ${repReq.status}.` });
    }

    if (repReq.sourceType === 'HUB_TRANSFER' && repReq.sourceHubId) {
      const sourceAvail = db.getAvailableStockForProductAtHub(repReq.sourceHubId, repReq.productId);
      if (sourceAvail < repReq.requestedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock at source hub to approve transfer. Available: ${sourceAvail} ${repReq.unit}`,
        });
      }

      // Auto-create matching HubTransfer record (Step 14 integration)
      const trfId = 'TRF-REP-' + Math.floor(1000 + Math.random() * 9000);
      db.transfers.unshift({
        id: trfId,
        sourceHubId: repReq.sourceHubId,
        sourceHubName: repReq.sourceHubName || repReq.sourceHubId,
        destinationHubId: repReq.hubId,
        destinationHubName: repReq.hubName,
        items: [
          {
            productId: repReq.productId,
            productName: repReq.productName,
            quantity: repReq.requestedQuantity,
            unit: repReq.unit,
          },
        ],
        status: 'Approved',
        requestedBy: repReq.requestedBy,
        approvedBy: req.user?.name || 'Admin',
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        notes: `Created via Replenishment Request #${repReq.id}`,
      });

      // Reserve stock at source hub
      db.reserveStockAtHub(repReq.sourceHubId, repReq.productId, repReq.requestedQuantity, trfId);
    }

    repReq.status = 'IN_PROGRESS';
    repReq.approvedBy = req.user?.name || 'Admin';
    repReq.updatedAt = new Date().toISOString();

    db.replenishmentRequests[reqIndex] = repReq;
    db.saveData();

    return res.json({
      success: true,
      message: `Replenishment request #${id} approved and status moved to IN_PROGRESS!` +
        (repReq.sourceType === 'HUB_TRANSFER' ? ' Created inter-hub transfer request.' : ' Awaiting farmer collection receipt.'),
      replenishment: repReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Delivery Partner Payouts & Settlement (Admin & Delivery Partner Access)
 */
export const getDeliveryPayouts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deliveryBoyId, hubId, status } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole !== 'delivery' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${userRole}' is not authorized to access delivery payouts.`,
      });
    }

    let list = db.payouts;

    // Security Check: Delivery Boy can ONLY view their own payout records
    if (userRole === 'delivery') {
      list = list.filter((p) => p.deliveryBoyId === userId);
    } else if (deliveryBoyId) {
      list = list.filter((p) => p.deliveryBoyId === String(deliveryBoyId));
    }

    if (hubId) {
      const hubLower = normalizeHubId(String(hubId));
      list = list.filter((p) => normalizeHubId(p.hubId) === hubLower);
    }

    if (status) {
      list = list.filter((p) => p.status === String(status));
    }

    // Analytics summary
    const totalCollectedCharges = Math.round(list.reduce((sum, p) => sum + p.customerDeliveryCharge, 0) * 100) / 100;
    const totalDeliveryPayouts = Math.round(list.reduce((sum, p) => sum + p.deliveryBoyPayout, 0) * 100) / 100;
    const netLogisticsBalance = Math.round((totalCollectedCharges - totalDeliveryPayouts) * 100) / 100;
    const pendingPayoutsAmount = Math.round(list.filter((p) => p.status === 'EARNED' || p.status === 'PENDING').reduce((sum, p) => sum + p.deliveryBoyPayout, 0) * 100) / 100;

    return res.json({
      success: true,
      payouts: list,
      settlementSummary: {
        totalCollectedCharges,
        totalDeliveryPayouts,
        netLogisticsBalance,
        pendingPayoutsAmount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve Delivery Payout (Admin Only)
 */
export const approveDeliveryPayout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payIndex = db.payouts.findIndex((p) => p.id === id);

    if (payIndex === -1) {
      return res.status(404).json({ success: false, message: 'Payout record not found.' });
    }

    const payout = db.payouts[payIndex];
    if (payout.status !== 'EARNED' && payout.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Payout is already ${payout.status}.` });
    }

    payout.status = 'APPROVED';
    payout.approvedBy = req.user?.name || 'Admin';
    payout.approvedAt = new Date().toISOString();

    db.payouts[payIndex] = payout;

    // Notify delivery boy that payout is approved
    createNotification({
      userId: payout.deliveryBoyId,
      role: 'delivery',
      title: 'Your delivery payout has been approved.',
      message: `Payout #${id} of ₹${payout.deliveryBoyPayout} for Order #${payout.orderId} has been approved by Admin.`,
      type: 'payment',
      priority: 'SUCCESS',
      relatedEntityId: id,
      relatedEntityType: 'payout',
    });

    db.saveData();

    return res.json({
      success: true,
      message: `Payout #${id} (₹${payout.deliveryBoyPayout} for ${payout.deliveryBoyName}) approved!`,
      payout,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark Delivery Payout Settled / Paid (Admin Only)
 */
export const markDeliveryPayoutPaid = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payIndex = db.payouts.findIndex((p) => p.id === id);

    if (payIndex === -1) {
      return res.status(404).json({ success: false, message: 'Payout record not found.' });
    }

    const payout = db.payouts[payIndex];
    payout.status = 'PAID';
    payout.paidAt = new Date().toISOString();

    db.payouts[payIndex] = payout;

    // Notify delivery boy that payout has been paid
    createNotification({
      userId: payout.deliveryBoyId,
      role: 'delivery',
      title: 'Your delivery payout has been paid.',
      message: `Payout #${id} of ₹${payout.deliveryBoyPayout} for Order #${payout.orderId} has been paid to your account.`,
      type: 'payment',
      priority: 'SUCCESS',
      relatedEntityId: id,
      relatedEntityType: 'payout',
    });

    db.saveData();

    return res.json({
      success: true,
      message: `Payout #${id} (₹${payout.deliveryBoyPayout}) marked as PAID.`,
      payout,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};





