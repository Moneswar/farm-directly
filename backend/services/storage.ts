import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  IUser,
  IProduct,
  IOrder,
  ICoupon,
  IOffer,
  INotification,
  IReview,
  ISupportTicket,
  IDeliverySettings,
  ICartItem,
  IWishlistItem,
  IHub,
  IPricingLogisticsConfig,
  IDeliveryDistanceSlab,
  IWholesaleQuantitySlab,
  IHubInventory,
  IInventoryMovement,
  IFarmerCollection,
  IHubTransfer,
  IReplenishmentRequest,
  IPayment,
  IDeliveryPayout,
  IDemandForecast,
} from '../models/index.js';

import { seededProducts } from './productsSeed.js';

export const INITIAL_HUBS: IHub[] = [
  {
    id: 'hub_cbe',
    name: 'Coimbatore Distribution Hub',
    code: 'CBE-HUB',
    city: 'Coimbatore',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    address: '108 Agricultural Complex, Avinashi Road, Coimbatore',
    pincode: '641004',
    phone: '+91 94421 10001',
    contactPhone: '+91 94421 10001',
    managerName: 'Karthik Raja',
    isActive: true,
    latitude: 11.0168,
    longitude: 76.9558,
  },
  {
    id: 'hub_pol',
    name: 'Pollachi Regional Hub',
    code: 'POL-HUB',
    city: 'Pollachi',
    district: 'Pollachi',
    state: 'Tamil Nadu',
    address: '45 Greenfields Terminal, Anaimalai Road, Pollachi',
    pincode: '642001',
    phone: '+91 94421 10002',
    contactPhone: '+91 94421 10002',
    managerName: 'Suresh Kumar',
    isActive: true,
    latitude: 10.6609,
    longitude: 77.0048,
  },
  {
    id: 'hub_nlg',
    name: 'Nilgiris Hill Produce Hub',
    code: 'NIL-HUB',
    city: 'Ooty',
    district: 'Nilgiris',
    state: 'Tamil Nadu',
    address: '12 Organic Hill Terminal, Coonoor Road, Ooty',
    pincode: '643001',
    phone: '+91 94421 10003',
    contactPhone: '+91 94421 10003',
    managerName: 'Anitha Ramesh',
    isActive: true,
    latitude: 11.4102,
    longitude: 76.6950,
  },
  {
    id: 'hub_maa',
    name: 'Chennai Central Hub',
    code: 'CHE-HUB',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    address: '88 Koyambedu Agro Logistics Park, Chennai',
    pincode: '600107',
    phone: '+91 94421 10004',
    contactPhone: '+91 94421 10004',
    managerName: 'Vijay Anand',
    isActive: true,
    latitude: 13.0827,
    longitude: 80.2707,
  },
  {
    id: 'hub_blr',
    name: 'Bengaluru Distribution Hub',
    code: 'BLR-HUB',
    city: 'Bengaluru',
    district: 'Bengaluru',
    state: 'Karnataka',
    address: '12 Yeshwantpur Wholesale Terminal, Bengaluru',
    pincode: '560022',
    phone: '+91 94421 10005',
    contactPhone: '+91 94421 10005',
    managerName: 'Suresh Gowda',
    isActive: true,
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    id: 'hub_hyd',
    name: 'Hyderabad Distribution Hub',
    code: 'HYD-HUB',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    address: '45 Bowenpally Market Complex, Hyderabad',
    pincode: '500011',
    phone: '+91 94421 10006',
    contactPhone: '+91 94421 10006',
    managerName: 'Vijay Reddy',
    isActive: true,
    latitude: 17.3850,
    longitude: 78.4867,
  },
];

/**
 * Standard City & District Center Coordinates Mapping
 */
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  pollachi: { lat: 10.6609, lng: 77.0048 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  ooty: { lat: 11.4102, lng: 76.6950 },
  nilgiris: { lat: 11.4102, lng: 76.6950 },
};

/**
 * Haversine Formula for Geographic Distance Calculation (in km)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;
  // Apply urban road detour factor (~1.3x) to convert straight-line to estimated driving road distance
  const roadEstDistance = Math.round(straightDistance * 1.3 * 10) / 10;
  return roadEstDistance > 0.5 ? roadEstDistance : 0.5;
}

export function getNearestHub(district?: string, pincode?: string): IHub {
  const distLower = (district || '').toLowerCase();
  if (distLower.includes('pollachi')) return INITIAL_HUBS[1];
  if (distLower.includes('nilgiri') || distLower.includes('coonoor') || distLower.includes('ooty')) return INITIAL_HUBS[2];
  if (distLower.includes('chennai') || distLower.includes('kanchipuram')) return INITIAL_HUBS[3];
  return INITIAL_HUBS[0];
}

export function normalizeHubId(hubId?: string, district?: string, pincode?: string): string {
  if (hubId === 'hub_che' || hubId === 'hub_maa') return 'hub_maa';
  if (hubId) {
    const matched = INITIAL_HUBS.find((h) => h.id === hubId);
    if (matched) return matched.id;
  }
  return getNearestHub(district, pincode).id;
}

export interface IFarmerLogisticsResult {
  farmerLocation: string;
  assignedHubId: string;
  assignedHubName: string;
  transportDistanceKm: number;
  farmerPrice: number;
  transportRatePerKmKg: number;
  farmerToHubTransportCost: number;
  companyCommissionRate: number;
  companyCommissionAmount: number;
  storageHandlingCost: number;
  estimatedCustomerPrice: number;
}

export function calculateFarmerLogistics(
  farmerLocationInput?: string,
  farmerPriceInput: number = 0,
  unit: string = 'Kg',
  quantity: number = 1
): IFarmerLogisticsResult {
  const loc = (farmerLocationInput || 'Pollachi').trim();
  const locLower = loc.toLowerCase();

  // Primary initial collection hub is Coimbatore Distribution Hub
  const hub = INITIAL_HUBS[0]; // Coimbatore Distribution Hub

  // Centralized distance mapping (Farmer Location -> Coimbatore Distribution Hub)
  let distanceKm = 45; // Default for Pollachi
  if (locLower.includes('pollachi')) {
    distanceKm = 45;
  } else if (locLower.includes('palani')) {
    distanceKm = 110;
  } else if (locLower.includes('erode')) {
    distanceKm = 95;
  } else if (locLower.includes('coimbatore')) {
    distanceKm = 15;
  } else if (locLower.includes('nilgiri') || locLower.includes('ooty') || locLower.includes('coonoor')) {
    distanceKm = 85;
  } else if (locLower.includes('chennai')) {
    distanceKm = 500;
  } else if (locLower.includes('madurai')) {
    distanceKm = 210;
  } else if (locLower.includes('salem')) {
    distanceKm = 165;
  } else if (locLower.includes('tiruppur')) {
    distanceKm = 55;
  } else {
    distanceKm = 50;
  }

  // Centralized Transport Rate Config: ₹0.05 per km per unit/kg
  const transportRatePerKmKg = 0.05;
  const transportCost = Math.round(distanceKm * transportRatePerKmKg * 100) / 100;

  // Company Commission Config: 10% on farmer product price
  const companyCommissionRate = 0.10;
  const commissionAmount = Math.round(farmerPriceInput * companyCommissionRate * 100) / 100;

  // Storage / Handling Cost
  const storageHandlingCost = 0;

  return {
    farmerLocation: loc,
    assignedHubId: hub.id,
    assignedHubName: hub.name,
    transportDistanceKm: distanceKm,
    farmerPrice: farmerPriceInput,
    transportRatePerKmKg,
    farmerToHubTransportCost: transportCost,
    companyCommissionRate,
    companyCommissionAmount: commissionAmount,
    storageHandlingCost,
    estimatedCustomerPrice: Math.round((farmerPriceInput + transportCost + commissionAmount + storageHandlingCost) * 1.15 * 100) / 100,
  };
}

export const DEFAULT_PRICING_CONFIG: IPricingLogisticsConfig = {
  companyCommissionRate: 0.10,
  retailMarginRate: 0.15,
  wholesaleSlabs: [
    { minQty: 10, maxQty: 49, marginRate: 0.08 },
    { minQty: 50, maxQty: 99, marginRate: 0.06 },
    { minQty: 100, maxQty: Infinity, marginRate: 0.05 },
  ],
  farmerTransportRatePerKmKg: 0.05,
  storageHandlingCost: 0,
  deliveryDistanceSlabs: [
    { minKm: 0, maxKm: 5, charge: 20 },
    { minKm: 5, maxKm: 10, charge: 30 },
    { minKm: 10, maxKm: 20, charge: 40 },
    { minKm: 20, maxKm: 30, charge: 50 },
    { minKm: 30, maxKm: 40, charge: 60 },
  ],
  deliveryBoyDefaultPayout: 60,
  defaultMinWholesaleQuantity: 10,
  gstPercentage: 5,
};

export function calculateCustomerSellingPrice(prod: IProduct): number {
  const cfg = db ? db.pricingConfig : DEFAULT_PRICING_CONFIG;
  const fPrice = prod.farmerPrice !== undefined && prod.farmerPrice > 0 ? prod.farmerPrice : prod.price;
  const transport = prod.farmerToHubTransportCost !== undefined && prod.farmerToHubTransportCost > 0
    ? prod.farmerToHubTransportCost
    : (prod.transportDistanceKm ? prod.transportDistanceKm * cfg.farmerTransportRatePerKmKg : 2.25);
  const commission = prod.companyCommissionAmount !== undefined && prod.companyCommissionAmount > 0
    ? prod.companyCommissionAmount
    : Math.round(fPrice * cfg.companyCommissionRate * 100) / 100;
  const storage = prod.storageHandlingCost !== undefined ? prod.storageHandlingCost : cfg.storageHandlingCost;

  const baseCost = fPrice + transport + commission + storage;
  const margin = baseCost * cfg.retailMarginRate;

  const sellingPrice = Math.round((baseCost + margin) * 100) / 100;
  return sellingPrice;
}

export interface IWholesalePricingSlab {
  minQty: number;
  maxQty: number;
  marginRate: number;
}

export interface IWholesalePricingConfig {
  defaultMinQuantity: number;
  slabs: IWholesalePricingSlab[];
}

export let wholesalePricingConfig: IWholesalePricingConfig = {
  defaultMinQuantity: 10,
  slabs: [
    { minQty: 10, maxQty: 49, marginRate: 0.08 },
    { minQty: 50, maxQty: 99, marginRate: 0.06 },
    { minQty: 100, maxQty: Infinity, marginRate: 0.05 },
  ],
};

export function updateWholesalePricingConfig(newConfig: Partial<IWholesalePricingConfig>) {
  if (newConfig.defaultMinQuantity !== undefined) {
    wholesalePricingConfig.defaultMinQuantity = newConfig.defaultMinQuantity;
  }
  if (newConfig.slabs && Array.isArray(newConfig.slabs)) {
    wholesalePricingConfig.slabs = newConfig.slabs;
  }
}

export function calculateWholesalePrice(prod: IProduct, quantity: number = 10): {
  baseCost: number;
  marginRate: number;
  wholesalePrice: number;
  minQuantity: number;
  subtotal: number;
  slabMarginPercentage: number;
} {
  const cfg = db ? db.pricingConfig : DEFAULT_PRICING_CONFIG;
  const fPrice = prod.farmerPrice !== undefined && prod.farmerPrice > 0 ? prod.farmerPrice : prod.price;
  const transport = prod.farmerToHubTransportCost !== undefined && prod.farmerToHubTransportCost > 0
    ? prod.farmerToHubTransportCost
    : (prod.transportDistanceKm ? prod.transportDistanceKm * cfg.farmerTransportRatePerKmKg : 2.25);
  const commission = prod.companyCommissionAmount !== undefined && prod.companyCommissionAmount > 0
    ? prod.companyCommissionAmount
    : Math.round(fPrice * cfg.companyCommissionRate * 100) / 100;
  const storage = prod.storageHandlingCost !== undefined ? prod.storageHandlingCost : cfg.storageHandlingCost;

  const baseCost = fPrice + transport + commission + storage;
  const qty = Math.max(1, Number(quantity) || 1);

  // Match slab based on quantity from db.pricingConfig
  const slabs = cfg.wholesaleSlabs && cfg.wholesaleSlabs.length > 0 ? cfg.wholesaleSlabs : DEFAULT_PRICING_CONFIG.wholesaleSlabs;
  const matchedSlab = slabs.find(
    (slab) => qty >= slab.minQty && qty <= slab.maxQty
  );

  let marginRate = 0.08;
  if (matchedSlab) {
    marginRate = matchedSlab.marginRate;
  } else if (qty >= 100) {
    marginRate = 0.05;
  } else if (qty >= 50) {
    marginRate = 0.06;
  } else {
    marginRate = 0.08;
  }

  const wholesalePrice = Math.round((baseCost + baseCost * marginRate) * 100) / 100;
  const subtotal = Math.round(wholesalePrice * qty * 100) / 100;

  return {
    baseCost: Math.round(baseCost * 100) / 100,
    marginRate,
    wholesalePrice,
    minQuantity: cfg.defaultMinWholesaleQuantity || 10,
    subtotal,
    slabMarginPercentage: Math.round(marginRate * 100),
  };
}

export function calculateHubToCustomerDelivery(
  districtInput?: string,
  pincodeInput?: string,
  deliveryMethod: string = 'self_pickup',
  customerLat?: number,
  customerLng?: number
) {
  const hub = getNearestHub(districtInput, pincodeInput);

  if (deliveryMethod === 'self_pickup') {
    return {
      deliveryMethod: 'self_pickup',
      deliveryCharge: 0,
      deliveryDistanceKm: 0,
      hubId: hub.id,
      hubName: hub.name,
      hubAddress: hub.address,
    };
  }

  // Home Delivery distance calculation
  let distanceKm = 6.5; // default urban distance
  let targetLat = customerLat;
  let targetLng = customerLng;

  // If customer coordinates are missing, resolve from standard city center coordinates
  if (!targetLat || !targetLng) {
    const cityKey = (districtInput || '').toLowerCase().trim();
    const cityCoord = CITY_COORDINATES[cityKey] || Object.entries(CITY_COORDINATES).find(([k]) => cityKey.includes(k))?.[1];
    if (cityCoord) {
      targetLat = cityCoord.lat + 0.02; // Realistic neighborhood offset (~2.5km)
      targetLng = cityCoord.lng + 0.02;
    }
  }

  if (hub.latitude && hub.longitude && targetLat && targetLng) {
    distanceKm = calculateHaversineDistanceKm(hub.latitude, hub.longitude, targetLat, targetLng);
  } else {
    // Fallback slab distance by district
    const distLower = (districtInput || '').toLowerCase();
    if (distLower.includes('chennai')) distanceKm = 8.2;
    else if (distLower.includes('bengaluru') || distLower.includes('bangalore')) distanceKm = 14.5;
    else if (distLower.includes('hyderabad')) distanceKm = 18.0;
    else if (distLower.includes('coimbatore')) distanceKm = 5.4;
    else if (distLower.includes('pollachi')) distanceKm = 7.0;
    else distanceKm = 8.5;
  }

  // Distance Slab Delivery Charge Configuration from db.pricingConfig
  const cfg = db ? db.pricingConfig : DEFAULT_PRICING_CONFIG;
  const slabs = cfg.deliveryDistanceSlabs && cfg.deliveryDistanceSlabs.length > 0
    ? cfg.deliveryDistanceSlabs
    : DEFAULT_PRICING_CONFIG.deliveryDistanceSlabs;

  let deliveryCharge = 30;
  const matchedSlab = slabs.find((s) => distanceKm >= s.minKm && distanceKm <= s.maxKm);
  if (matchedSlab) {
    deliveryCharge = matchedSlab.charge;
  } else if (distanceKm <= 5) deliveryCharge = 20;
  else if (distanceKm <= 10) deliveryCharge = 30;
  else if (distanceKm <= 20) deliveryCharge = 40;
  else if (distanceKm <= 30) deliveryCharge = 50;
  else if (distanceKm <= 40) deliveryCharge = 60;
  else deliveryCharge = 70;

  return {
    deliveryMethod: 'home_delivery',
    deliveryCharge,
    deliveryDistanceKm: distanceKm,
    hubId: hub.id,
    hubName: hub.name,
    hubAddress: hub.address,
    customerLat: targetLat,
    customerLng: targetLng,
  };
}

export function calculateDeliveryBoyPayout(order?: IOrder): number {
  const cfg = db ? db.pricingConfig : DEFAULT_PRICING_CONFIG;
  return cfg.deliveryBoyDefaultPayout || 60;
}


const DATA_FILE = path.join(process.cwd(), 'backend', 'data.json');

class StorageService {
  public users: IUser[] = [];
  public products: IProduct[] = [];
  public orders: IOrder[] = [];
  public hubs: IHub[] = INITIAL_HUBS;
  public coupons: ICoupon[] = [];
  public offers: IOffer[] = [];
  public notifications: INotification[] = [];
  public reviews: IReview[] = [];
  public supportTickets: ISupportTicket[] = [];
  public carts: Record<string, ICartItem[]> = {}; // userId -> items
  public wishlists: Record<string, string[]> = {}; // userId -> productIds
  public deliverySettings: IDeliverySettings = {
    deliveryChargePerKm: 5,
    baseDeliveryCharge: 40,
    freeDeliveryThreshold: 500,
    gstPercentage: 5,
  };
  public pricingConfig: IPricingLogisticsConfig = { ...DEFAULT_PRICING_CONFIG };
  public inventory: IHubInventory[] = [];
  public inventoryMovements: IInventoryMovement[] = [];
  public collections: IFarmerCollection[] = [];
  public transfers: IHubTransfer[] = [];
  public replenishmentRequests: IReplenishmentRequest[] = [];
  public payments: IPayment[] = [];
  public payouts: IDeliveryPayout[] = [];
  public demandForecasts: IDemandForecast[] = [];

  constructor() {
    this.initData();
  }

  private async initData() {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.users = parsed.users || [];
        // Ensure default seeded delivery partners are always present
        const seededDeliveryPartners = [
          {
            id: 'usr_delivery1',
            name: 'Karthik Express',
            email: 'delivery@farmdirect.com',
            phone: '+91 98765 43213',
            passwordHash: await bcrypt.hash('password123', 10),
            role: 'delivery' as const,
            address: '22 Station Road, Gandhipuram',
            state: 'Tamil Nadu',
            district: 'Coimbatore',
            pincode: '641012',
            profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            status: 'approved' as const,
            walletBalance: 1800,
            rewardPoints: 110,
            loyaltyTier: 'Bronze',
            assignedHubId: 'hub_cbe',
            distributionHubName: 'Coimbatore Distribution Hub',
            vehicleType: 'EV Cargo Scooter',
            vehicleNumber: 'TN 37 CZ 9012',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'usr_delivery_che',
            name: 'Ravi Chennai Delivery',
            email: 'delivery.chennai@farmdirect.com',
            phone: '+91 98765 43220',
            passwordHash: await bcrypt.hash('password123', 10),
            role: 'delivery' as const,
            address: '88 Koyambedu Market Road',
            state: 'Tamil Nadu',
            district: 'Chennai',
            pincode: '600107',
            profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
            status: 'approved' as const,
            walletBalance: 1200,
            rewardPoints: 80,
            loyaltyTier: 'Bronze',
            assignedHubId: 'hub_maa',
            distributionHubId: 'hub_maa',
            distributionHubName: 'Chennai Central Hub',
            vehicleType: 'Delivery Van',
            vehicleNumber: 'TN 01 AB 1234',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'usr_delivery_blr',
            name: 'Suresh Bengaluru Express',
            email: 'delivery.blr@farmdirect.com',
            phone: '+91 98765 43221',
            passwordHash: await bcrypt.hash('password123', 10),
            role: 'delivery' as const,
            address: '12 Yeshwantpur Market Road',
            state: 'Karnataka',
            district: 'Bengaluru',
            pincode: '560022',
            profileImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
            status: 'approved' as const,
            walletBalance: 1500,
            rewardPoints: 90,
            loyaltyTier: 'Bronze',
            assignedHubId: 'hub_blr',
            distributionHubId: 'hub_blr',
            distributionHubName: 'Bengaluru Distribution Hub',
            vehicleType: 'Cargo Auto',
            vehicleNumber: 'KA 04 MP 5678',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'usr_delivery_hyd',
            name: 'Vijay Hyderabad Express',
            email: 'delivery.hyd@farmdirect.com',
            phone: '+91 98765 43222',
            passwordHash: await bcrypt.hash('password123', 10),
            role: 'delivery' as const,
            address: '45 Bowenpally Market Complex',
            state: 'Telangana',
            district: 'Hyderabad',
            pincode: '500011',
            profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
            status: 'approved' as const,
            walletBalance: 1100,
            rewardPoints: 75,
            loyaltyTier: 'Bronze',
            assignedHubId: 'hub_hyd',
            distributionHubId: 'hub_hyd',
            distributionHubName: 'Hyderabad Distribution Hub',
            vehicleType: 'EV Bike',
            vehicleNumber: 'TS 09 XY 9988',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        for (const sAgent of seededDeliveryPartners) {
          if (!this.users.some((u) => u.id === sAgent.id)) {
            this.users.push(sAgent as unknown as IUser);
          }
        }

        // Guarantee standard seed account passwords match demo credentials
        const salt = await bcrypt.genSalt(10);
        const adminUser = this.users.find((u) => u.email === 'admin@farmdirect.com');
        if (adminUser) adminUser.passwordHash = await bcrypt.hash('adminpassword123', salt);

        const farmerUser = this.users.find((u) => u.email === 'farmer@farmdirect.com');
        if (farmerUser) farmerUser.passwordHash = await bcrypt.hash('farmerpassword123', salt);

        const custUser = this.users.find((u) => u.email === 'customer@farmdirect.com');
        if (custUser) custUser.passwordHash = await bcrypt.hash('customerpassword123', salt);

        const delivUser = this.users.find((u) => u.email === 'delivery@farmdirect.com');
        if (delivUser) delivUser.passwordHash = await bcrypt.hash('deliverypassword123', salt);

        const shopUser = this.users.find((u) => u.email === 'shopkeeper@farmdirect.com');
        if (shopUser) shopUser.passwordHash = await bcrypt.hash('customerpassword123', salt);
        this.orders = parsed.orders || [];
        this.coupons = parsed.coupons || [];
        this.offers = parsed.offers || [];
        this.notifications = parsed.notifications || [];
        this.reviews = parsed.reviews || [];
        this.supportTickets = parsed.supportTickets || [];
        this.carts = parsed.carts || {};
        this.wishlists = parsed.wishlists || {};
        if (parsed.deliverySettings) this.deliverySettings = parsed.deliverySettings;
        if (parsed.pricingConfig) this.pricingConfig = { ...DEFAULT_PRICING_CONFIG, ...parsed.pricingConfig };
        this.inventory = parsed.inventory || [];
        this.inventoryMovements = parsed.inventoryMovements || [];
        this.collections = parsed.collections || [];
        this.transfers = parsed.transfers || [];
        this.replenishmentRequests = parsed.replenishmentRequests || [];
        this.payments = parsed.payments || [];
        this.payouts = parsed.payouts || [];
        this.demandForecasts = parsed.demandForecasts || [];

        // Always use seededProducts as the authoritative catalog (merged with any farmer-added products)
        const farmerProducts = (parsed.products || []).filter(
          (p: any) => !seededProducts.some((sp) => sp.id === p.id)
        );
        this.products = [...seededProducts, ...farmerProducts];

        // Seed initial hub inventory batches if empty
        if (this.inventory.length === 0) {
          this.seedInitialHubInventory();
        }

        this.saveData();
        console.log(`📦 Products catalog initialized with ${this.products.length} products (${seededProducts.length} seeded + ${farmerProducts.length} farmer-added). Hub Inventory batches: ${this.inventory.length}`);
        return;
      } catch (err) {
        console.error('Failed to parse data.json, re-seeding...', err);
      }
    }

    console.log('🌱 Seeding fresh database for FarmDirect...');
    await this.seedInitialData();
    this.saveData();
  }

  public saveData() {
    try {
      const data = {
        users: this.users,
        products: this.products,
        orders: this.orders,
        coupons: this.coupons,
        offers: this.offers,
        notifications: this.notifications,
        reviews: this.reviews,
        supportTickets: this.supportTickets,
        carts: this.carts,
        wishlists: this.wishlists,
        deliverySettings: this.deliverySettings,
        pricingConfig: this.pricingConfig,
        inventory: this.inventory,
        inventoryMovements: this.inventoryMovements,
        collections: this.collections,
        transfers: this.transfers,
        replenishmentRequests: this.replenishmentRequests,
        payments: this.payments,
        payouts: this.payouts,
        demandForecasts: this.demandForecasts,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  private async seedInitialData() {
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);
    const adminPasswordHash = await bcrypt.hash('adminpassword123', salt);
    const farmerPasswordHash = await bcrypt.hash('farmerpassword123', salt);
    const customerPasswordHash = await bcrypt.hash('customerpassword123', salt);
    const deliveryPasswordHash = await bcrypt.hash('deliverypassword123', salt);

    // Seed Users
    this.users = [
      {
        id: 'usr_admin',
        name: 'System Administrator',
        email: 'admin@farmdirect.com',
        phone: '+91 98765 43210',
        passwordHash: adminPasswordHash,
        role: 'admin',
        address: 'HQ FarmDirect Tower, Block A',
        state: 'Tamil Nadu',
        district: 'Chennai',
        pincode: '600001',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: 'approved',
        walletBalance: 10000,
        rewardPoints: 500,
        loyaltyTier: 'Platinum',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_farmer1',
        name: 'Ramesh Greenfields',
        email: 'farmer@farmdirect.com',
        phone: '+91 98765 43211',
        passwordHash: farmerPasswordHash,
        role: 'farmer',
        address: '12 Organic Valley Road, Pollachi',
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        pincode: '641001',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        status: 'approved',
        walletBalance: 4850,
        rewardPoints: 240,
        loyaltyTier: 'Gold',
        farmName: 'Greenfields Organic Farm',
        farmLocation: 'Pollachi, Coimbatore',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_farmer2',
        name: 'Anitha Sivam',
        email: 'anitha@organicfarms.in',
        phone: '+91 98765 43214',
        passwordHash: defaultPasswordHash,
        role: 'farmer',
        address: '45 Sunshine Orchard, Ooty Hill Road',
        state: 'Tamil Nadu',
        district: 'Nilgiris',
        pincode: '643001',
        profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        status: 'approved',
        walletBalance: 3200,
        rewardPoints: 150,
        loyaltyTier: 'Silver',
        farmName: 'Nilgiris High Altitude Farms',
        farmLocation: 'Coonoor, Nilgiris',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_customer1',
        name: 'Priya Sharma',
        email: 'customer@farmdirect.com',
        phone: '+91 98765 43212',
        passwordHash: customerPasswordHash,
        role: 'customer',
        address: '7B Green Park Apartments, Anna Nagar',
        state: 'Tamil Nadu',
        district: 'Chennai',
        pincode: '600040',
        profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        status: 'approved',
        walletBalance: 1250,
        rewardPoints: 320,
        loyaltyTier: 'Gold',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_shopkeeper1',
        name: 'Murugan Traders',
        email: 'shopkeeper@farmdirect.com',
        phone: '+91 98765 43299',
        passwordHash: customerPasswordHash,
        role: 'shopkeeper',
        businessName: 'Murugan Fresh Vegetable Mart',
        businessType: 'Retail & Wholesale Grocery',
        businessRegNo: 'GST33AABCM1234F1Z5',
        address: '42 Main Bazaar Street, Gandhipuram',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        pincode: '641012',
        profileImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
        status: 'approved',
        walletBalance: 15000,
        rewardPoints: 450,
        loyaltyTier: 'Silver',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_delivery1',
        name: 'Karthik Express',
        email: 'delivery@farmdirect.com',
        phone: '+91 98765 43213',
        passwordHash: deliveryPasswordHash,
        role: 'delivery',
        address: '22 Station Road, Gandhipuram',
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        pincode: '641012',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        status: 'approved',
        walletBalance: 1800,
        rewardPoints: 110,
        loyaltyTier: 'Bronze',
        assignedHubId: 'hub_cbe',
        distributionHubName: 'Coimbatore Distribution Hub',
        vehicleType: 'EV Cargo Scooter',
        vehicleNumber: 'TN 37 CZ 9012',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_delivery_che',
        name: 'Ravi Chennai Delivery',
        email: 'delivery.chennai@farmdirect.com',
        phone: '+91 98765 43220',
        passwordHash: deliveryPasswordHash,
        role: 'delivery',
        address: '88 Koyambedu Market Road',
        state: 'Tamil Nadu',
        district: 'Chennai',
        pincode: '600107',
        profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        status: 'approved',
        walletBalance: 1200,
        rewardPoints: 80,
        loyaltyTier: 'Bronze',
        assignedHubId: 'hub_che',
        distributionHubName: 'Chennai Distribution Hub',
        vehicleType: 'Delivery Van',
        vehicleNumber: 'TN 01 AB 1234',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_delivery_blr',
        name: 'Suresh Bengaluru Express',
        email: 'delivery.blr@farmdirect.com',
        phone: '+91 98765 43221',
        passwordHash: deliveryPasswordHash,
        role: 'delivery',
        address: '12 Yeshwantpur Market Road',
        state: 'Karnataka',
        district: 'Bengaluru',
        pincode: '560022',
        profileImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
        status: 'approved',
        walletBalance: 1500,
        rewardPoints: 90,
        loyaltyTier: 'Bronze',
        assignedHubId: 'hub_blr',
        distributionHubName: 'Bengaluru Distribution Hub',
        vehicleType: 'Cargo Auto',
        vehicleNumber: 'KA 04 MP 5678',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_delivery_hyd',
        name: 'Vijay Hyderabad Express',
        email: 'delivery.hyd@farmdirect.com',
        phone: '+91 98765 43222',
        passwordHash: deliveryPasswordHash,
        role: 'delivery',
        address: '45 Bowenpally Market Complex',
        state: 'Telangana',
        district: 'Hyderabad',
        pincode: '500011',
        profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        status: 'approved',
        walletBalance: 1100,
        rewardPoints: 75,
        loyaltyTier: 'Bronze',
        assignedHubId: 'hub_hyd',
        distributionHubName: 'Hyderabad Distribution Hub',
        vehicleType: 'EV Bike',
        vehicleNumber: 'TS 09 XY 9988',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Seed Products
    this.products = seededProducts;

    // Seed Coupons & Offers
    this.coupons = [
      {
        id: 'cpn_1',
        code: 'FARM100',
        discountPercentage: 15,
        maxDiscount: 100,
        minOrderAmount: 300,
        validUntil: '2026-12-31',
        description: 'Flat 15% OFF on orders above ₹300',
        isActive: true,
      },
      {
        id: 'cpn_2',
        code: 'HARVEST20',
        discountPercentage: 20,
        maxDiscount: 200,
        minOrderAmount: 500,
        validUntil: '2026-12-31',
        description: '20% OFF on organic products',
        isActive: true,
      },
    ];

    this.offers = [
      {
        id: 'off_1',
        title: 'Festival Harvest Special: 20% Off Fruits',
        bannerImage: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1000',
        category: 'Fruits',
        discountPercentage: 20,
        validUntil: '2026-09-30',
        description: 'Get straight from farmer organic hill fruits at slashed rates!',
      },
      {
        id: 'off_2',
        title: 'Organic Milk & Dairy Morning Blast',
        bannerImage: 'https://images.unsplash.com/photo-1528498033373-3c6c08e93d79?w=1000',
        category: 'Dairy',
        discountPercentage: 10,
        validUntil: '2026-10-15',
        description: 'Subscribe or order fresh A2 milk with zero delivery charge.',
      },
    ];

    // Seed Orders
    this.orders = [];

    // Seed Notifications
    this.notifications = [];

    // Seed Reviews
    this.reviews = [];

    // Seed Initial Hub Inventory
    this.seedInitialHubInventory();
  }

  private seedInitialHubInventory() {
    this.inventory = [];
    this.inventoryMovements = [];

    this.products.forEach((prod, idx) => {
      if (prod.status === 'Approved') {
        const hubId = prod.assignedHubId || 'hub_cbe';
        const batchSeq = String(idx + 1).padStart(3, '0');
        const batchId = `${hubId.toUpperCase().replace('HUB_', '')}-${prod.name.substring(0, 3).toUpperCase()}-2026-${batchSeq}`;
        const qty = prod.stock > 0 ? prod.stock : 100;

        const invRecord: IHubInventory = {
          id: `inv_${prod.id}_${hubId}`,
          hubId,
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
          receivedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'available',
        };

        this.inventory.push(invRecord);

        this.inventoryMovements.push({
          id: `mov_seed_${prod.id}`,
          hubInventoryId: invRecord.id,
          hubId,
          productId: prod.id,
          farmerId: invRecord.farmerId,
          batchId,
          type: 'RECEIVED',
          quantity: qty,
          timestamp: invRecord.receivedAt,
          notes: 'Initial inventory batch receipt at hub',
        });
      }
    });
  }

  public getAvailableStockForProductAtHub(hubId: string, productId: string): number {
    const hubLower = normalizeHubId(hubId);
    const records = this.inventory.filter(
      (inv) => normalizeHubId(inv.hubId) === hubLower && inv.productId === productId
    );
    return records.reduce((sum, inv) => sum + (inv.quantityAvailable || 0), 0);
  }

  public reserveStockAtHub(hubId: string, productId: string, qty: number, orderId: string): boolean {
    const hubLower = normalizeHubId(hubId);
    const records = this.inventory.filter(
      (inv) => normalizeHubId(inv.hubId) === hubLower && inv.productId === productId && inv.quantityAvailable > 0
    );

    let remainingNeeded = qty;
    for (const record of records) {
      if (remainingNeeded <= 0) break;
      const alloc = Math.min(record.quantityAvailable, remainingNeeded);
      record.quantityAvailable -= alloc;
      record.quantityReserved += alloc;
      record.updatedAt = new Date().toISOString();
      if (record.quantityAvailable === 0 && record.quantityReserved > 0) record.status = 'reserved';
      remainingNeeded -= alloc;

      this.inventoryMovements.push({
        id: 'mov_' + Math.floor(100000 + Math.random() * 900000),
        hubInventoryId: record.id,
        hubId: record.hubId,
        productId,
        farmerId: record.farmerId,
        batchId: record.batchId,
        orderId,
        type: 'RESERVED',
        quantity: alloc,
        timestamp: new Date().toISOString(),
        notes: `Reserved ${alloc} ${record.unit} for order #${orderId}`,
      });
    }

    return remainingNeeded === 0;
  }

  public releaseStockAtHub(hubId: string, productId: string, qty: number, orderId: string): boolean {
    const hubLower = normalizeHubId(hubId);
    const records = this.inventory.filter(
      (inv) => normalizeHubId(inv.hubId) === hubLower && inv.productId === productId && inv.quantityReserved > 0
    );

    let remainingToRelease = qty;
    for (const record of records) {
      if (remainingToRelease <= 0) break;
      const release = Math.min(record.quantityReserved, remainingToRelease);
      record.quantityReserved -= release;
      record.quantityAvailable += release;
      record.updatedAt = new Date().toISOString();
      if (record.quantityAvailable > 0) record.status = 'available';
      remainingToRelease -= release;

      this.inventoryMovements.push({
        id: 'mov_' + Math.floor(100000 + Math.random() * 900000),
        hubInventoryId: record.id,
        hubId: record.hubId,
        productId,
        farmerId: record.farmerId,
        batchId: record.batchId,
        orderId,
        type: 'RELEASED',
        quantity: release,
        timestamp: new Date().toISOString(),
        notes: `Released ${release} ${record.unit} reserved stock for cancelled order #${orderId}`,
      });
    }

    return remainingToRelease === 0;
  }

  public dispatchStockAtHub(hubId: string, productId: string, qty: number, orderId: string): boolean {
    const hubLower = normalizeHubId(hubId);
    const records = this.inventory.filter(
      (inv) => normalizeHubId(inv.hubId) === hubLower && inv.productId === productId && inv.quantityReserved > 0
    );

    let remainingToDispatch = qty;
    for (const record of records) {
      if (remainingToDispatch <= 0) break;
      const dispatch = Math.min(record.quantityReserved, remainingToDispatch);
      record.quantityReserved -= dispatch;
      record.quantitySold += dispatch;
      record.updatedAt = new Date().toISOString();
      if (record.quantityAvailable === 0 && record.quantityReserved === 0) record.status = 'depleted';
      remainingToDispatch -= dispatch;

      this.inventoryMovements.push({
        id: 'mov_' + Math.floor(100000 + Math.random() * 900000),
        hubInventoryId: record.id,
        hubId: record.hubId,
        productId,
        farmerId: record.farmerId,
        batchId: record.batchId,
        orderId,
        type: 'DISPATCHED',
        quantity: dispatch,
        timestamp: new Date().toISOString(),
        notes: `Dispatched ${dispatch} ${record.unit} for completed/dispatched order #${orderId}`,
      });
    }

    return remainingToDispatch === 0;
  }
  public createCollectionTaskForProduct(prod: IProduct): IFarmerCollection {
    const hub = INITIAL_HUBS.find((h) => h.id === prod.assignedHubId) || INITIAL_HUBS[0];
    const farmer = this.users.find((u) => u.id === prod.farmerId) || { name: prod.farmerName || 'Farmer', district: prod.location || 'Pollachi', phone: '+91 98765 43210' };

    const colId = 'COL-' + Math.floor(1000 + Math.random() * 9000);
    const collection: IFarmerCollection = {
      id: colId,
      productId: prod.id,
      productName: prod.name,
      farmerId: prod.farmerId || 'usr_farmer1',
      farmerName: prod.farmerName || farmer.name,
      farmerLocation: prod.location || farmer.district || 'Pollachi',
      farmerPhone: farmer.phone || '+91 98765 43210',
      hubId: hub.id,
      hubName: hub.name,
      transportDistanceKm: prod.transportDistanceKm || 45,
      farmerToHubTransportCost: prod.farmerToHubTransportCost || 2.25,
      expectedQuantity: prod.stock || 100,
      unit: prod.unit || 'Kg',
      status: 'Collection Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = this.collections.findIndex((c) => c.productId === prod.id);
    if (existingIdx > -1) {
      this.collections[existingIdx] = { ...this.collections[existingIdx], status: 'Collection Pending' };
      return this.collections[existingIdx];
    }

    this.collections.push(collection);
    return collection;
  }
  public getInventoryStockStatus(quantityAvailable: number, threshold: number = 10): 'OUT_OF_STOCK' | 'LOW_STOCK' | 'AVAILABLE' {
    if (quantityAvailable <= 0) return 'OUT_OF_STOCK';
    if (quantityAvailable <= threshold) return 'LOW_STOCK';
    return 'AVAILABLE';
  }
}

export const db = new StorageService();

