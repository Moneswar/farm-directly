import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { DistributionHub } from '../models/Hub.js';
import { db, INITIAL_HUBS } from '../services/storage.js';
import { seededProducts } from '../services/productsSeed.js';

const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
dotenv.config();

export const connectMongoDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri =
    process.env.MONGO_URI?.trim() ||
    process.env.MONGODB_URI?.trim() ||
    (!isProduction ? 'mongodb://127.0.0.1:27017/farm' : '');

  if (!mongoUri) {
    console.error('❌ MONGO_URI environment variable is missing.');
    if (isProduction && process.env.ALLOW_JSON_FALLBACK !== 'true') {
      console.error('❌ Production mode requires MONGO_URI (or MONGODB_URI). Stopping server startup to prevent silent data split.');
      throw new Error('MONGO_URI is required in production environment.');
    }
    console.warn('⚠️ Development mode: Server will run using local JSON database fallback.');
    return false;
  }

  const isAtlas = mongoUri.startsWith('mongodb+srv://') || mongoUri.includes('mongodb.net');

  try {
    if (isAtlas) {
      console.log('🔄 Connecting to MongoDB Atlas cluster...');
    } else {
      console.log('🔄 Connecting to MongoDB...');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    const dbName = mongoose.connection.name || 'farm';
    if (isAtlas) {
      console.log(`✅ MongoDB Atlas Connected successfully (Database: ${dbName})`);
    } else {
      console.log(`✅ MongoDB Connected successfully (Database: ${dbName})`);
    }

    // Seed and sync initial default users into MongoDB to guarantee valid password hashes
    for (const u of db.users) {
      await User.findOneAndUpdate(
        { email: u.email.toLowerCase() },
        {
          $set: {
            id: u.id,
            name: u.name,
            email: u.email.toLowerCase(),
            phone: u.phone,
            passwordHash: u.passwordHash,
            role: u.role,
            status: u.status,
            address: u.address,
            district: u.district,
            state: u.state,
            pincode: u.pincode,
            walletBalance: u.walletBalance,
            rewardPoints: u.rewardPoints,
            loyaltyTier: u.loyaltyTier,
            farmName: u.farmName || '',
            farmLocation: u.farmLocation || '',
            vehicleType: u.vehicleType || '',
            vehicleNumber: u.vehicleNumber || '',
          },
        },
        { upsert: true }
      );
    }
    console.log('✅ Default users synced into MongoDB successfully.');

    // Seed vegetable products into MongoDB if collection is empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('🌱 Seeding vegetable products into MongoDB...');
      for (const p of seededProducts) {
        try {
          await Product.create(p);
        } catch (err: any) {
          // Skip duplicates
          if (err.code !== 11000) console.warn('Product seed warning:', err.message);
        }
      }
      console.log(`✅ ${seededProducts.length} vegetable products seeded into MongoDB successfully.`);
    } else {
      // Upsert seeded products to ensure they always exist
      for (const p of seededProducts) {
        await Product.findOneAndUpdate({ id: p.id }, p, { upsert: true, returnDocument: 'after' });
      }
      console.log(`✅ ${seededProducts.length} vegetable products synced in MongoDB.`);
    }

    // Seed Distribution Hubs into MongoDB if missing/outdated
    for (const h of INITIAL_HUBS) {
      await DistributionHub.findOneAndUpdate({ id: h.id }, h, { upsert: true, returnDocument: 'after' });
    }
    console.log(`✅ ${INITIAL_HUBS.length} Distribution Hubs synced in MongoDB.`);

    return true;
  } catch (err: any) {
    console.error('❌ MongoDB Connection Error:', err.message || err);
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_JSON_FALLBACK !== 'true') {
      console.error('❌ Production mode requiring MongoDB failed to connect. Stopping server startup to prevent silent data split.');
      throw new Error(`MongoDB connection failed in production: ${err.message || err}`);
    }
    console.warn('⚠️ Development mode: Server will run using local JSON database fallback.');
    return false;
  }
};

