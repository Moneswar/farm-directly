import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User, IUserDocument } from '../models/User.js';
import { db } from '../services/storage.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { IUser, UserRole } from '../models/index.js';

/**
 * Register a new user in MongoDB Atlas (with local store fallback/sync)
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      address,
      state,
      district,
      pincode,
      profileImage,
      farmName,
      farmLocation,
      vehicleType,
      vehicleNumber,
      businessName,
      businessType,
      businessRegNo,
      city,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required fields.',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Check existing user in MongoDB Atlas if connected, or local db
    let existingUser = null;
    if (mongoose.connection.readyState === 1) {
      existingUser = await User.findOne({ email: normalizedEmail }).exec();
    } else {
      existingUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);
    const userId = 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6);

    // Initial status: Farmer requires admin approval, Delivery is auto-approved
    let initialStatus: 'pending' | 'approved' = 'approved';
    if (role === 'farmer') {
      initialStatus = 'pending';
    }

    const userPayload: IUser = {
      id: userId,
      name,
      email: normalizedEmail,
      phone: phone || '',
      passwordHash,
      role: role as UserRole,
      address: address || '',
      state: state || 'Tamil Nadu',
      district: district || 'Coimbatore',
      pincode: pincode || '641001',
      profileImage: profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      status: initialStatus,
      walletBalance: role === 'customer' || role === 'shopkeeper' ? 500 : 0,
      rewardPoints: 100,
      loyaltyTier: 'Bronze',
      farmName: farmName || '',
      farmLocation: farmLocation || '',
      vehicleType: vehicleType || '',
      vehicleNumber: vehicleNumber || '',
      businessName: businessName || '',
      businessType: businessType || '',
      businessRegNo: businessRegNo || '',
      city: city || district || 'Coimbatore',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to MongoDB Atlas if connected
    if (mongoose.connection.readyState === 1) {
      await User.create(userPayload);
    }

    // Always keep local storage in sync as well
    db.users.push(userPayload);
    if (initialStatus === 'pending') {
      db.notifications.push({
        id: 'notif_' + Date.now(),
        userId: 'usr_admin',
        title: `New ${role.toUpperCase()} Registration`,
        message: `${name} registered as a ${role} and is awaiting admin approval.`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    db.saveData();

    // Generate JWT token
    const token = generateToken({
      id: userPayload.id,
      email: userPayload.email,
      role: userPayload.role,
      name: userPayload.name,
    });

    const { passwordHash: _, ...safeUser } = userPayload;

    return res.status(201).json({
      success: true,
      message: initialStatus === 'pending'
        ? 'Registration successful! Your account is pending admin approval.'
        : 'Registration successful! Welcome to FarmDirect.',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.',
    });
  }
};

/**
 * Login user with bcrypt password verification & JWT token generation
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Find user in MongoDB Atlas if connected, or local memory
    let user: IUser | null = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await User.findOne({ email: normalizedEmail }).lean().exec();
      if (doc) user = doc as unknown as IUser;
    }
    if (!user) {
      user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User account not found.',
      });
    }

    // Role check if specified
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as '${user.role.toUpperCase()}', not '${role.toUpperCase()}'. Please log in through the correct portal.`,
      });
    }

    // Status check
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked by Administrator.',
      });
    }

    // Verify password with bcrypt
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.',
    });
  }
};

/**
 * Get current authenticated user profile
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let user: IUser | null = db.users.find((u) => u.id === userId) || null;
    if (!user && mongoose.connection.readyState === 1) {
      const doc = await User.findOne({ id: userId }).lean().exec();
      if (doc) user = doc as unknown as IUser;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update authenticated user profile
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      name,
      phone,
      address,
      state,
      district,
      pincode,
      profileImage,
      farmName,
      farmLocation,
      vehicleType,
      vehicleNumber,
    } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (state) updates.state = state;
    if (district) updates.district = district;
    if (pincode) updates.pincode = pincode;
    if (profileImage) updates.profileImage = profileImage;
    if (farmName) updates.farmName = farmName;
    if (farmLocation) updates.farmLocation = farmLocation;
    if (vehicleType) updates.vehicleType = vehicleType;
    if (vehicleNumber) updates.vehicleNumber = vehicleNumber;

    // Update in MongoDB Atlas
    if (mongoose.connection.readyState === 1) {
      await User.findOneAndUpdate({ id: userId }, { $set: updates }).exec();
    }

    // Update local storage
    const localIndex = db.users.findIndex((u) => u.id === userId);
    if (localIndex !== -1) {
      db.users[localIndex] = { ...db.users[localIndex], ...updates };
      db.saveData();
    }

    // Get fresh user data
    let freshUser: IUser | null = null;
    if (mongoose.connection.readyState === 1) {
      const doc = await User.findOne({ id: userId }).lean().exec();
      if (doc) freshUser = doc as unknown as IUser;
    }
    if (!freshUser && localIndex !== -1) {
      freshUser = db.users[localIndex];
    }

    if (!freshUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { passwordHash: _, ...safeUser } = freshUser;

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
