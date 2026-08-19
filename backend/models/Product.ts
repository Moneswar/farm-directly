import mongoose, { Schema, Model, Document } from 'mongoose';
import { ProductCategory, ProductUnit } from './index.js';

export interface IProductDocument extends Document {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerDistrict?: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  marketPrice?: number;
  quantity: number;
  unit: ProductUnit;
  organic: boolean;
  image: string;
  harvestDate: string;
  availabilityDate: string;
  expiryDate: string;
  location: string;
  stock: number;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  rating: number;
  reviewsCount: number;
  rejectionReason?: string;
  farmerPrice?: number;
  transportDistanceKm?: number;
  farmerToHubTransportCost?: number;
  companyCommissionRate?: number;
  companyCommissionAmount?: number;
  storageHandlingCost?: number;
  assignedHubId?: string;
  assignedHubName?: string;
  createdAt: string;
  updatedAt: string;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    id: { type: String, required: true, unique: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, required: true },
    farmerDistrict: { type: String, default: 'Coimbatore' },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Vegetables',
        'Fruits',
        'Dry Fruits',
        'Leafy Greens',
        'Greens',
        'Grains',
        'Rice',
        'Pulses',
        'Spices',
        'Nuts & Dry Fruits',
        'Seeds',
        'Flowers',
        'Dairy',
        'Milk Products',
        'Honey',
        'Eggs',
        'Oils',
        'Herbs',
        'Others',
        'Organic',
      ],
      default: 'Vegetables',
    },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    marketPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
    unit: {
      type: String,
      default: 'Kg',
    },
    organic: { type: Boolean, default: true },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
    },
    harvestDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    availabilityDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    expiryDate: {
      type: String,
      default: () => new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    },
    location: { type: String, default: 'Pollachi, Tamil Nadu' },
    stock: { type: Number, required: true, default: 10 },
    status: {
      type: String,
      enum: ['Approved', 'Pending Approval', 'Rejected'],
      default: 'Pending Approval',
    },
    rating: { type: Number, default: 5.0 },
    reviewsCount: { type: Number, default: 0 },
    rejectionReason: { type: String, default: '' },
    farmerPrice: { type: Number, default: 0 },
    transportDistanceKm: { type: Number, default: 0 },
    farmerToHubTransportCost: { type: Number, default: 0 },
    companyCommissionRate: { type: Number, default: 0.10 },
    companyCommissionAmount: { type: Number, default: 0 },
    storageHandlingCost: { type: Number, default: 0 },
    assignedHubId: { type: String, default: '' },
    assignedHubName: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ status: 1 });

if ((mongoose.models as any).Product) {
  delete (mongoose.models as any).Product;
}
export const Product: Model<IProductDocument> = mongoose.model<IProductDocument>('Product', ProductSchema);
