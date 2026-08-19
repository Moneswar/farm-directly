import mongoose, { Schema, Model, Document } from 'mongoose';
import { UserRole } from './index.js';

export interface IUserDocument extends Document {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  address: string;
  state: string;
  district: string;
  pincode: string;
  profileImage?: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  walletBalance: number;
  rewardPoints: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  vehicleType?: string;
  vehicleNumber?: string;
  farmName?: string;
  farmLocation?: string;
  distributionHubId?: string;
  distributionHubName?: string;
  businessName?: string;
  businessType?: string;
  businessRegNo?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['farmer', 'customer', 'delivery', 'admin', 'shopkeeper'],
      default: 'customer',
    },
    address: { type: String, default: '' },
    state: { type: String, default: 'Tamil Nadu' },
    district: { type: String, default: 'Coimbatore' },
    pincode: { type: String, default: '641001' },
    profileImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'blocked'],
      default: 'approved',
    },
    walletBalance: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 100 },
    loyaltyTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    vehicleType: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    farmName: { type: String, default: '' },
    farmLocation: { type: String, default: '' },
    distributionHubId: { type: String, default: '' },
    distributionHubName: { type: String, default: '' },
    businessName: { type: String, default: '' },
    businessType: { type: String, default: '' },
    businessRegNo: { type: String, default: '' },
    city: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ role: 1 });

export const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) || mongoose.model<IUserDocument>('User', UserSchema);
