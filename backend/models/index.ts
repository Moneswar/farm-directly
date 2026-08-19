export type UserRole = 'farmer' | 'customer' | 'delivery' | 'admin' | 'shopkeeper';

export interface IUser {
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
  latitude?: number;
  longitude?: number;
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
  assignedHubId?: string;
  businessName?: string;
  businessType?: string;
  businessRegNo?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory =
  | 'Vegetables'
  | 'Fruits'
  | 'Dry Fruits'
  | 'Leafy Greens'
  | 'Greens'
  | 'Grains'
  | 'Rice'
  | 'Pulses'
  | 'Spices'
  | 'Nuts & Dry Fruits'
  | 'Seeds'
  | 'Flowers'
  | 'Dairy'
  | 'Milk Products'
  | 'Honey'
  | 'Eggs'
  | 'Oils'
  | 'Herbs'
  | 'Others'
  | 'Organic';

export type ProductUnit = 'Kg' | 'Gram' | 'Liter' | 'Piece' | 'Pack' | 'Dozen' | 'Ml';

export interface IProduct {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerDistrict: string;
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
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  rating: number;
  reviewsCount: number;
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

export interface ICartItem {
  id: string;
  productId: string;
  product: IProduct;
  quantity: number;
  priceAtAddition: number;
}

export interface IWishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

export interface IHub {
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
  contactPhone?: string;
  managerName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Assigned'
  | 'Pickup Complete'
  | 'Arrived at Hub'
  | 'Hub Processing'
  | 'Ready for Pickup'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export interface IOrderItem {
  productId: string;
  productName: string;
  farmerId: string;
  farmerName: string;
  price: number;
  quantity: number;
  unit: string;
  image: string;
  financials?: IOrderItemFinancial;
}

export interface IOrderItemFinancial {
  farmerPrice: number;
  farmerProductCost: number;
  farmerToHubTransportCost: number;
  companyCommissionAmount: number;
  storageHandlingCost: number;
  baseCostPerUnit: number;
  marginAmountPerUnit: number;
  sellingPricePerUnit: number;
  itemSubtotal: number;
}

export interface IOrderPricingSnapshot {
  farmerProductCost: number;
  farmerTransportCost: number;
  companyCommission: number;
  storageHandlingCost: number;
  retailOrWholesaleMargin: number;
  itemsSubtotal: number;
  deliveryCharge: number;
  deliveryBoyPayout: number;
  customerGrandTotal: number;
  companyGrossEarnings: number;
  appliedCommissionRate: number;
  appliedMarginRate: number;
}

export interface IOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    district: string;
    state: string;
    pincode: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  };
  items: IOrderItem[];
  subtotal: number;
  gstAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'UPI' | 'GPay' | 'PhonePe' | 'Paytm' | 'Card' | 'NetBanking' | 'COD' | 'Wallet' | 'online_payment' | string;
  paymentStatus: 'Pending' | 'Completed' | 'Paid' | 'PAID' | 'FAILED' | 'Refunded' | 'REFUNDED' | string;
  paymentId?: string;
  transactionId?: string;
  orderStatus: OrderStatus;
  deliveryMethod?: 'self_pickup' | 'home_delivery' | string;
  deliveryDistanceKm?: number;
  deliveryHubId?: string;
  deliveryHubName?: string;
  hubId?: string;
  hubName?: string;
  hubStatus?: 'Pending Processing' | 'Arrived at Hub' | 'Hub Processing' | 'Dispatched from Hub' | 'Completed' | string;
  deliveryBoyId?: string;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  deliveryOtp?: string;
  deliveryOtpVerified?: boolean;
  deliveryOtpVerifiedAt?: string;
  deliveredAt?: string;
  deliveryCompletedBy?: string;
  pickupProofImage?: string;
  deliveryProofImage?: string;
  digitalSignature?: string;
  estimatedDeliveryDate: string;
  placedAt: string;
  updatedAt: string;
  pickupCompletedAt?: string;
  pickupVerificationCode?: string;
  orderType?: 'retail' | 'wholesale';
  buyerRole?: 'customer' | 'shopkeeper';
  pricingSnapshot?: IOrderPricingSnapshot;
}

export interface IPayment {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'online_payment' | 'cash_on_delivery' | 'wallet' | string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  transactionId?: string;
  gatewayReference?: string;
  createdAt: string;
  paidAt?: string;
  failedAt?: string;
  notes?: string;
}

export interface ICoupon {
  id: string;
  code: string;
  discountPercentage: number;
  maxDiscount: number;
  minOrderAmount: number;
  validUntil: string;
  description: string;
  isActive: boolean;
}

export interface IOffer {
  id: string;
  title: string;
  bannerImage: string;
  category?: ProductCategory;
  discountPercentage: number;
  validUntil: string;
  description: string;
}

export interface INotification {
  id: string;
  userId: string; // user ID, 'all', or 'admin'
  role?: 'customer' | 'farmer' | 'delivery' | 'shopkeeper' | 'admin' | string;
  title: string;
  message: string;
  type: 'order' | 'product' | 'system' | 'delivery' | 'offer' | 'payment' | 'payout' | 'inventory' | 'transfer' | 'replenishment' | string;
  priority?: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  relatedEntityId?: string;
  relatedEntityType?: 'order' | 'product' | 'collection' | 'transfer' | 'replenishment' | 'payout' | 'inventory' | string;
  read: boolean;
  createdAt: string;
}

export interface IReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ISupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  replies: {
    sender: 'user' | 'admin';
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface IDeliverySettings {
  deliveryChargePerKm: number;
  baseDeliveryCharge: number;
  freeDeliveryThreshold: number;
  gstPercentage: number;
}

export interface IDeliveryDistanceSlab {
  minKm: number;
  maxKm: number;
  charge: number;
}

export interface IWholesaleQuantitySlab {
  minQty: number;
  maxQty: number;
  marginRate: number;
}

export interface IPricingLogisticsConfig {
  companyCommissionRate: number;
  retailMarginRate: number;
  wholesaleSlabs: IWholesaleQuantitySlab[];
  farmerTransportRatePerKmKg: number;
  storageHandlingCost: number;
  deliveryDistanceSlabs: IDeliveryDistanceSlab[];
  deliveryBoyDefaultPayout: number;
  defaultMinWholesaleQuantity: number;
  gstPercentage: number;
}

export interface IHubInventory {
  id: string;
  hubId: string;
  productId: string;
  productName: string;
  farmerId: string;
  farmerName: string;
  batchId: string;
  quantityReceived: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantitySold: number;
  unit: string;
  lowStockThreshold?: number;
  receivedAt: string;
  updatedAt: string;
  status: 'received' | 'available' | 'reserved' | 'depleted';
}

export interface IReplenishmentRequest {
  id: string;
  hubId: string;
  hubName: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  unit: string;
  currentAvailableQuantity: number;
  lowStockThreshold: number;
  sourceType: 'FARMER_SUPPLY' | 'HUB_TRANSFER';
  sourceHubId?: string;
  sourceHubName?: string;
  status: 'REQUESTED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}


export interface IInventoryMovement {
  id: string;
  hubInventoryId?: string;
  hubId: string;
  productId: string;
  farmerId: string;
  batchId: string;
  orderId?: string;
  type: 'RECEIVED' | 'RESERVED' | 'RELEASED' | 'DISPATCHED' | 'SOLD' | 'TRANSFER_RESERVED' | 'TRANSFER_DISPATCHED' | 'TRANSFER_RECEIVED';
  quantity: number;
  timestamp: string;
  notes?: string;
}

export interface IFarmerCollection {
  id: string;
  productId: string;
  productName: string;
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  farmerPhone?: string;
  hubId: string;
  hubName: string;
  transportDistanceKm: number;
  farmerToHubTransportCost: number;
  expectedQuantity: number;
  receivedQuantity?: number;
  discrepancyQuantity?: number;
  unit: string;
  status: 'Pending Approval' | 'Approved' | 'Collection Pending' | 'Collection Assigned' | 'Collection Accepted' | 'Collected' | 'In Transit' | 'Arrived at Hub' | 'Received at Hub';
  deliveryBoyId?: string;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  collectedAt?: string;
  receivedAt?: string;
  notes?: string;
}

export interface IHubTransferItem {
  productId: string;
  productName: string;
  batchId?: string;
  quantity: number;
  unit: string;
}

export interface IHubTransfer {
  id: string;
  sourceHubId: string;
  sourceHubName: string;
  destinationHubId: string;
  destinationHubName: string;
  items: IHubTransferItem[];
  status: 'Requested' | 'Approved' | 'Dispatched' | 'In Transit' | 'Received' | 'Completed' | 'Rejected' | 'Cancelled';
  requestedBy: string;
  approvedBy?: string;
  requestedAt: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  discrepancyQuantity?: number;
  notes?: string;
}

export interface IDeliveryPayout {
  id: string;
  orderId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  hubId: string;
  hubName: string;
  deliveryMethod: 'home_delivery';
  deliveryDistanceKm: number;
  customerDeliveryCharge: number;
  deliveryBoyPayout: number;
  deliveryLogisticsBalance: number;
  status: 'EARNED' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  approvedBy?: string;
  notes?: string;
}

export interface IDemandForecast {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory | string;
  unit: ProductUnit | string;
  hubId: string;
  hubName: string;
  forecastPeriod: '7_days' | '14_days' | '30_days';
  retailDemand: number;
  wholesaleDemand: number;
  predictedQuantity: number;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  currentStock: number;
  confirmedIncoming: number;
  expectedRemaining: number;
  predictedShortage: number;
  safetyStock: number;
  recommendedReplenishment: number;
  stockoutDays?: number;
  recommendationType: 'HUB_TRANSFER' | 'FARMER_SUPPLY';
  recommendedSourceHubId?: string;
  recommendedSourceHubName?: string;
  recommendedSourceHubAvailableStock?: number;
  explanation: string;
  dataQualityStatus: 'Sufficient Data' | 'Limited Data' | 'Insufficient Historical Data';
  isIgnored?: boolean;
  acceptedAt?: string;
  generatedAt: string;
  modelVersion: string;
}






