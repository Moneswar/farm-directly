import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IHubDocument extends Document {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  managerName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const HubSchema = new Schema<IHubDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, default: 'Tamil Nadu' },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    phone: { type: String, default: '' },
    managerName: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

if ((mongoose.models as any).DistributionHub) {
  delete (mongoose.models as any).DistributionHub;
}

export const DistributionHub: Model<IHubDocument> =
  mongoose.model<IHubDocument>('DistributionHub', HubSchema);
