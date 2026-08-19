import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import {
  Shield,
  Users,
  Tractor,
  Truck,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  Tag,
  Gift,
  FileText,
  UserCheck,
  UserX,
  Send,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Eye,
  Check,
  Percent,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Award,
  ArrowLeft,
  Building,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Map,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { apiFetch } from '../services/api';
import { useI18n } from '../context/LanguageContext';

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: '#2ECC71',
  Fruits: '#E67E22',
  'Dry Fruits': '#F1C40F',
  Greens: '#27AE60',
  'Organic Products': '#16A085',
  Rice: '#E74C3C',
  Pulses: '#9B59B6',
  Spices: '#D35400',
  Flowers: '#E84393',
  Seeds: '#8E44AD',
  'Milk Products': '#3498DB',
  Honey: '#F39C12',
  Eggs: '#F1C40F',
  'Natural Oils': '#1ABC9C',
  Herbs: '#2ECC71',
  Others: '#95A5A6',
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<
    | 'analytics'
    | 'approvals'
    | 'users'
    | 'orders'
    | 'hubs'
    | 'pickup_queue'
    | 'coupons'
    | 'offers'
    | 'settings'
    | 'farmer_collections'
    | 'delivery_payouts'
    | 'hub_transfers'
    | 'hub_inventory'
    | 'ai_forecasts'
  >('analytics');

  const [analytics, setAnalytics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [hubsList, setHubsList] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [offersList, setOffersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'farmer' | 'customer' | 'delivery'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  const [userSearch, setUserSearch] = useState('');

  const [productStatusFilter, setProductStatusFilter] = useState<'All' | 'Pending Approval' | 'Approved' | 'Rejected'>('Pending Approval');

  // Hub Modal States
  const [showHubModal, setShowHubModal] = useState(false);
  const [editingHub, setEditingHub] = useState<any | null>(null);
  const [hubFormData, setHubFormData] = useState({
    name: '',
    code: '',
    city: '',
    district: '',
    state: 'Tamil Nadu',
    pincode: '',
    address: '',
    phone: '',
    managerName: '',
    latitude: 0,
    longitude: 0,
    isActive: true,
  });

  // Detailed Hub View Modal
  const [selectedHubDetail, setSelectedHubDetail] = useState<any | null>(null);
  const [hubDetailData, setHubDetailData] = useState<any | null>(null);
  const [loadingHubDetail, setLoadingHubDetail] = useState(false);

  // User Assign Hub Modal State
  const [assigningUser, setAssigningUser] = useState<any | null>(null);
  const [selectedHubForUser, setSelectedHubForUser] = useState('');
  const [assigningHub, setAssigningHub] = useState(false);

  // Rejection Modal State
  const [rejectingProduct, setRejectingProduct] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Forms
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountPercentage: 15,
    maxDiscount: 200,
    minOrderAmount: 300,
    validUntil: '2026-12-31',
    description: '',
  });

  const [offerForm, setOfferForm] = useState({
    title: '',
    bannerImage: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1000',
    category: 'Vegetables',
    discountPercentage: 20,
    validUntil: '2026-12-31',
    description: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    baseDeliveryCharge: 40,
    freeDeliveryThreshold: 500,
    gstPercentage: 5,
    deliveryChargePerKm: 5,
  });

  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<Record<string, string>>({});
  const [pickupOtpInputs, setPickupOtpInputs] = useState<Record<string, string>>({});
  const [pickupHubFilter, setPickupHubFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');

  // Step 10: Centralized Pricing & Logistics Configuration State
  const [pricingConfigForm, setPricingConfigForm] = useState<any>({
    companyCommissionRate: 0.10,
    retailMarginRate: 0.15,
    farmerTransportRatePerKmKg: 0.05,
    storageHandlingCost: 0,
    deliveryBoyDefaultPayout: 60,
    defaultMinWholesaleQuantity: 10,
    gstPercentage: 5,
    wholesaleSlabs: [
      { minQty: 10, maxQty: 49, marginRate: 0.08 },
      { minQty: 50, maxQty: 99, marginRate: 0.06 },
      { minQty: 100, maxQty: 9999, marginRate: 0.05 },
    ],
    deliveryDistanceSlabs: [
      { minKm: 0, maxKm: 5, charge: 20 },
      { minKm: 5, maxKm: 10, charge: 30 },
      { minKm: 10, maxKm: 20, charge: 40 },
      { minKm: 20, maxKm: 30, charge: 50 },
      { minKm: 30, maxKm: 40, charge: 60 },
    ],
  });

  const [previewFarmerPrice, setPreviewFarmerPrice] = useState<number>(30);
  const [previewDistance, setPreviewDistance] = useState<number>(8.5);
  const [previewWholesaleQty, setPreviewWholesaleQty] = useState<number>(50);
  const [savingPricingConfig, setSavingPricingConfig] = useState<boolean>(false);
  const [selectedFinancialOrder, setSelectedFinancialOrder] = useState<any>(null);

  // Step 12: Hub Inventory State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [selectedHubFilter, setSelectedHubFilter] = useState<string>('all');
  const [receivingProductModal, setReceivingProductModal] = useState<any>(null);
  const [receiveQuantityInput, setReceiveQuantityInput] = useState<number>(50);

  // Step 13: Farmer Collections State
  const [collectionsList, setCollectionsList] = useState<any[]>([]);
  const [receivingCollectionModal, setReceivingCollectionModal] = useState<any | null>(null);
  const [actualReceivedQty, setActualReceivedQty] = useState<number>(0);
  const [receiptNotes, setReceiptNotes] = useState<string>('');

  // Step 14: Hub Transfers State
  const [transfersList, setTransfersList] = useState<any[]>([]);
  const [showCreateTransferModal, setShowCreateTransferModal] = useState<boolean>(false);
  const [transferSourceHub, setTransferSourceHub] = useState<string>('hub_cbe');
  const [transferDestHub, setTransferDestHub] = useState<string>('hub_che');
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferQuantityInput, setTransferQuantityInput] = useState<number>(50);
  const [transferNotesInput, setTransferNotesInput] = useState<string>('');
  const [receivingTransferModal, setReceivingTransferModal] = useState<any | null>(null);
  const [actualTransferReceivedQty, setActualTransferReceivedQty] = useState<number>(0);
  const [transferReceiptNotes, setTransferReceiptNotes] = useState<string>('');

  // Step 15: Stock Replenishment State
  const [replenishmentsList, setReplenishmentsList] = useState<any[]>([]);
  const [selectedInventoryStatusFilter, setSelectedInventoryStatusFilter] = useState<string>('all');
  const [showReplenishmentModal, setShowReplenishmentModal] = useState<boolean>(false);
  const [replenishHubId, setReplenishHubId] = useState<string>('hub_cbe');
  const [replenishProductId, setReplenishProductId] = useState<string>('');
  const [replenishQtyInput, setReplenishQtyInput] = useState<number>(100);
  const [replenishSourceType, setReplenishSourceType] = useState<'FARMER_SUPPLY' | 'HUB_TRANSFER'>('FARMER_SUPPLY');
  const [replenishSourceHubId, setReplenishSourceHubId] = useState<string>('hub_che');
  const [replenishNotesInput, setReplenishNotesInput] = useState<string>('');
  // Step 17: Delivery Boy Payout & Settlement State
  const [deliveryPayoutsList, setDeliveryPayoutsList] = useState<any[]>([]);
  const [logisticsSettlementSummary, setLogisticsSettlementSummary] = useState<any>(null);

  // Step 20: AI Demand Forecasting State
  const [forecastsList, setForecastsList] = useState<any[]>([]);
  const [forecastSummary, setForecastSummary] = useState<any>(null);
  const [selectedForecastPeriod, setSelectedForecastPeriod] = useState<'7_days' | '14_days' | '30_days'>('7_days');
  const [selectedForecastHub, setSelectedForecastHub] = useState<string>('all');
  const [selectedForecastCategory, setSelectedForecastCategory] = useState<string>('all');
  const [forecastSearch, setForecastSearch] = useState<string>('');
  const [forecastStatusFilter, setForecastStatusFilter] = useState<string>('all');
  const [selectedForecastModal, setSelectedForecastModal] = useState<any | null>(null);
  const [refreshingForecasts, setRefreshingForecasts] = useState<boolean>(false);


  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, productsRes, ordersRes, hubsRes, couponsRes, offersRes, pricingRes, inventoryRes, collectionsRes, transfersRes, replenishmentsRes, payoutsRes, forecastRes] = await Promise.all([
        apiFetch('/admin/analytics'),
        apiFetch('/admin/users'),
        apiFetch('/products?status='),
        apiFetch('/orders'),
        apiFetch('/admin/hubs'),
        apiFetch('/admin/coupons'),
        apiFetch('/admin/offers'),
        apiFetch('/admin/pricing-config'),
        apiFetch('/admin/inventory'),
        apiFetch('/admin/collections'),
        apiFetch('/admin/transfers'),
        apiFetch('/admin/replenishments'),
        apiFetch('/admin/payouts'),
        apiFetch(`/admin/forecasts?period=${selectedForecastPeriod}`),
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.analytics);
      if (usersRes.success) setUsersList(usersRes.users || []);
      if (productsRes.success) setProductsList(productsRes.products || []);
      if (ordersRes.success) setOrdersList(ordersRes.orders || []);
      if (hubsRes.success) setHubsList(hubsRes.hubs || []);
      if (couponsRes.success) setCouponsList(couponsRes.coupons || []);
      if (offersRes.success) setOffersList(offersRes.offers || []);
      if (pricingRes?.success && pricingRes.config) setPricingConfigForm(pricingRes.config);
      if (inventoryRes?.success && inventoryRes.inventory) setInventoryList(inventoryRes.inventory || []);
      if (collectionsRes?.success && collectionsRes.collections) setCollectionsList(collectionsRes.collections || []);
      if (transfersRes?.success && transfersRes.transfers) setTransfersList(transfersRes.transfers || []);
      if (replenishmentsRes?.success && replenishmentsRes.replenishments) setReplenishmentsList(replenishmentsRes.replenishments || []);
      if (payoutsRes?.success) {
        setDeliveryPayoutsList(payoutsRes.payouts || []);
        if (payoutsRes.settlementSummary) setLogisticsSettlementSummary(payoutsRes.settlementSummary);
      }
      if (forecastRes?.success) {
        setForecastsList(forecastRes.forecasts || []);
        setForecastSummary(forecastRes.summary || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadForecasts = async (period = selectedForecastPeriod) => {
    try {
      const res = await apiFetch(`/admin/forecasts?period=${period}`);
      if (res?.success) {
        setForecastsList(res.forecasts || []);
        setForecastSummary(res.summary || null);
      }
    } catch (err) {
      console.error('Error loading AI forecasts:', err);
    }
  };

  const handleRefreshForecasts = async () => {
    try {
      setRefreshingForecasts(true);
      const res = await apiFetch('/admin/forecasts/refresh', {
        method: 'POST',
        body: JSON.stringify({ period: selectedForecastPeriod }),
      });
      if (res?.success) {
        alert(res.message);
        setForecastsList(res.forecasts || []);
        loadForecasts(selectedForecastPeriod);
      } else {
        alert(`Failed: ${res?.message}`);
      }
    } catch (err: any) {
      alert(`Error refreshing forecasts: ${err.message}`);
    } finally {
      setRefreshingForecasts(false);
    }
  };

  const handleAcceptRecommendation = async (forecast: any) => {
    if (!window.confirm(`Accept AI Recommendation for ${forecast.productName} at ${forecast.hubName}?\n\nThis will automatically create a ${forecast.recommendationType === 'HUB_TRANSFER' ? 'Hub Transfer Request from ' + (forecast.recommendedSourceHubName || 'surplus hub') : 'Farmer Supply Replenishment Request'} for ${forecast.recommendedReplenishment} ${forecast.unit}.`)) return;

    try {
      const res = await apiFetch(`/admin/forecasts/${forecast.id}/accept`, { method: 'POST' });
      if (res?.success) {
        alert(res.message);
        loadAdminData();
        loadForecasts(selectedForecastPeriod);
      } else {
        alert(`Failed: ${res?.message}`);
      }
    } catch (err: any) {
      alert(`Error accepting recommendation: ${err.message}`);
    }
  };

  const handleIgnoreRecommendation = async (forecast: any) => {
    try {
      const res = await apiFetch(`/admin/forecasts/${forecast.id}/ignore`, { method: 'POST' });
      if (res?.success) {
        alert(`Recommendation ignored for ${forecast.productName}.`);
        loadForecasts(selectedForecastPeriod);
      }
    } catch (err: any) {
      alert(`Error ignoring recommendation: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // User Management
  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        alert(res.message);
        loadAdminData();
      } else {
        alert(`Failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Assign Hub Modal
  const openAssignHubModal = (user: any) => {
    setAssigningUser(user);
    setSelectedHubForUser(user.distributionHubId || '');
  };

  // Save User Hub Assignment
  const handleSaveAssignHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    setAssigningHub(true);

    try {
      const res = await apiFetch(`/admin/users/${assigningUser.id}/assign-hub`, {
        method: 'PUT',
        body: JSON.stringify({ hubId: selectedHubForUser }),
      });

      if (res.success) {
        alert(res.message);
        setAssigningUser(null);
        loadAdminData();
      } else {
        alert(`Failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setAssigningHub(false);
    }
  };

  // Hub Management Actions
  const handleOpenAddHubModal = () => {
    setEditingHub(null);
    setHubFormData({
      name: '',
      code: '',
      city: '',
      district: '',
      state: 'Tamil Nadu',
      pincode: '',
      address: '',
      phone: '',
      managerName: '',
      latitude: 11.0168,
      longitude: 76.9558,
      isActive: true,
    });
    setShowHubModal(true);
  };

  const handleOpenEditHubModal = (hub: any) => {
    setEditingHub(hub);
    setHubFormData({
      name: hub.name || '',
      code: hub.code || '',
      city: hub.city || '',
      district: hub.district || '',
      state: hub.state || 'Tamil Nadu',
      pincode: hub.pincode || '',
      address: hub.address || '',
      phone: hub.phone || '',
      managerName: hub.managerName || '',
      latitude: hub.latitude || 0,
      longitude: hub.longitude || 0,
      isActive: hub.isActive !== false,
    });
    setShowHubModal(true);
  };

  const handleSaveHub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingHub ? `/admin/hubs/${editingHub.id}` : '/admin/hubs';
      const method = editingHub ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(hubFormData),
      });

      if (res.success) {
        alert(res.message);
        setShowHubModal(false);
        setEditingHub(null);
        loadAdminData();
      } else {
        alert(`Failed to save hub: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleHubStatus = async (hub: any) => {
    try {
      const res = await apiFetch(`/admin/hubs/${hub.id}/status`, { method: 'PATCH' });
      if (res.success) {
        alert(res.message);
        loadAdminData();
      } else {
        alert(`Failed to update hub status: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleViewHubDetail = async (hub: any) => {
    setSelectedHubDetail(hub);
    setLoadingHubDetail(true);
    try {
      const res = await apiFetch(`/admin/hubs/${hub.id}`);
      if (res.success) {
        setHubDetailData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHubDetail(false);
    }
  };

  // Product Approval
  const handleApproveProduct = async (productId: string) => {
    try {
      const res = await apiFetch(`/products/${productId}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.success) {
        alert('Produce approved and published to Customer Marketplace!');
        loadAdminData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRejectModal = (product: any) => {
    setRejectingProduct(product);
    setRejectionReasonInput('');
  };

  const handleConfirmRejectProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingProduct || !rejectionReasonInput.trim()) return;

    try {
      const res = await apiFetch(`/products/${rejectingProduct.id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: rejectionReasonInput.trim(),
        }),
      });

      if (res.success) {
        alert('Product rejected and feedback sent to farmer.');
        setRejectingProduct(null);
        loadAdminData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delivery Assignment
  const handleAssignDelivery = async (orderId: string) => {
    const dId = selectedDeliveryBoy[orderId];
    if (!dId) return alert('Please select a delivery agent first');

    try {
      const res = await apiFetch(`/orders/${orderId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryBoyId: dId }),
      });
      if (res.success) {
        alert(res.message);
        loadAdminData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Self Pickup: Mark Ready for Pickup
  const handleMarkReadyForPickup = async (orderId: string) => {
    if (!window.confirm('Mark this Self Pickup order as Ready for Customer Collection?')) return;
    try {
      const res = await apiFetch(`/orders/${orderId}/ready-for-pickup`, { method: 'PATCH' });
      if (res.success) {
        alert(`✅ ${res.message}\nCustomer has been notified to collect their order.`);
        loadAdminData();
      } else {
        alert(`Failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Self Pickup: Complete Pickup (with OTP verification)
  const handleCompletePickup = async (orderId: string) => {
    const otp = pickupOtpInputs[orderId]?.trim();
    if (!otp || otp.length !== 4) {
      alert('Please enter the 4-digit pickup verification code provided by the customer.');
      return;
    }
    try {
      const res = await apiFetch(`/orders/${orderId}/complete-pickup`, {
        method: 'PATCH',
        body: JSON.stringify({ pickupVerificationCode: otp }),
      });
      if (res.success) {
        alert(`✅ ${res.message}`);
        setPickupOtpInputs((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
        loadAdminData();
      } else {
        alert(`Failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Coupons
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(couponForm),
      });
      if (res.success) {
        alert('Coupon code created successfully!');
        setCouponForm({
          code: '',
          discountPercentage: 15,
          maxDiscount: 200,
          minOrderAmount: 300,
          validUntil: '2026-12-31',
          description: '',
        });
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleCoupon = async (id: string) => {
    try {
      const res = await apiFetch(`/admin/coupons/${id}/toggle`, { method: 'PATCH' });
      if (res.success) loadAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this promotional coupon?')) return;
    try {
      const res = await apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' });
      if (res.success) loadAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Offers
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/admin/offers', {
        method: 'POST',
        body: JSON.stringify(offerForm),
      });
      if (res.success) {
        alert('Marketplace promotional offer banner created!');
        setOfferForm({
          title: '',
          bannerImage: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1000',
          category: 'Vegetables',
          discountPercentage: 20,
          validUntil: '2026-12-31',
          description: '',
        });
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Remove this promotional offer banner?')) return;
    try {
      const res = await apiFetch(`/admin/offers/${id}`, { method: 'DELETE' });
      if (res.success) loadAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delivery Settings Update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      if (res.success) alert('Platform configuration saved!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered Users
  let filteredUsers = usersList;
  if (userRoleFilter !== 'all') filteredUsers = filteredUsers.filter((u) => u.role === userRoleFilter);
  if (userStatusFilter !== 'all') filteredUsers = filteredUsers.filter((u) => u.status === userStatusFilter);
  if (userSearch.trim()) {
    const q = userSearch.toLowerCase();
    filteredUsers = filteredUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.district && u.district.toLowerCase().includes(q))
    );
  }

  // Filtered Products
  let filteredProducts = productsList;
  if (productStatusFilter !== 'All') {
    filteredProducts = filteredProducts.filter((p) => p.status === productStatusFilter);
  }

  const deliveryAgents = usersList.filter((u) => u.role === 'delivery' && u.status === 'approved');
  const activeHubs = hubsList.filter((h) => h.isActive !== false);

  const pendingProductsCount = productsList.filter((p) => p.status === 'Pending Approval').length;
  const pendingUsersCount = usersList.filter((u) => u.status === 'pending').length;

  // Pie chart category data
  const categoryChartData = Object.entries(analytics?.categorySales || {}).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#3498DB',
  }));

  const productStatusData = [
    { name: 'Approved', count: productsList.filter((p) => p.status === 'Approved').length, fill: '#2ECC71' },
    { name: 'Pending', count: pendingProductsCount, fill: '#F39C12' },
    { name: 'Rejected', count: productsList.filter((p) => p.status === 'Rejected').length, fill: '#FF4757' },
  ];

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>

      {/* Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #09120C 0%, #15251B 100%)',
          color: '#ffffff',
          border: '1px solid rgba(46, 204, 113, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                background: '#FF4757',
                color: '#ffffff',
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                boxShadow: '0 8px 20px rgba(255, 71, 87, 0.4)',
              }}
            >
              <Shield size={34} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Administrator Master Control</h1>
                <span className="badge badge-success" style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ECC71' }}>
                  System Active & Verified
                </span>
              </div>
              <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Quality verification, regional distribution hubs, order assignments, promotional campaigns, and platform analytics
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={loadAdminData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={16} /> Sync Data
            </button>
            <button
              className="btn btn-primary"
              onClick={() => alert('📊 Financial summary exported!')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FileText size={16} /> Export Financials
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <BarChart3 size={16} /> Analytics Dashboard
        </button>

        <button
          onClick={() => setActiveTab('hubs')}
          className={`btn ${activeTab === 'hubs' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Building size={16} /> Distribution Hubs ({hubsList.length})
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <Package size={16} /> Product Approvals
          {pendingProductsCount > 0 && (
            <span
              style={{
                background: '#FF4757',
                color: '#fff',
                borderRadius: '50%',
                padding: '2px 7px',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginLeft: '6px',
              }}
            >
              {pendingProductsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <Users size={16} /> User Management
          {pendingUsersCount > 0 && (
            <span
              style={{
                background: '#E67E22',
                color: '#fff',
                borderRadius: '50%',
                padding: '2px 7px',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginLeft: '6px',
              }}
            >
              {pendingUsersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Truck size={16} /> Assign Delivery Boy ({ordersList.filter((o: any) => o.deliveryMethod !== 'self_pickup').length})
        </button>

        <button
          onClick={() => setActiveTab('pickup_queue')}
          className={`btn ${activeTab === 'pickup_queue' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <Package size={16} /> Hub Pickup Queue
          {ordersList.filter((o: any) => o.deliveryMethod === 'self_pickup' && (o.orderStatus === 'Confirmed' || o.orderStatus === 'Hub Processing' || o.orderStatus === 'Ready for Pickup')).length > 0 && (
            <span style={{ background: '#2ECC71', color: '#fff', borderRadius: '50%', padding: '2px 7px', fontSize: '0.75rem', fontWeight: 800, marginLeft: '6px' }}>
              {ordersList.filter((o: any) => o.deliveryMethod === 'self_pickup' && (o.orderStatus === 'Confirmed' || o.orderStatus === 'Hub Processing' || o.orderStatus === 'Ready for Pickup')).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Tag size={16} /> Coupons ({couponsList.length})
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`btn ${activeTab === 'offers' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Gift size={16} /> Offers ({offersList.length})
        </button>

        <button
          onClick={() => setActiveTab('farmer_collections')}
          className={`btn ${activeTab === 'farmer_collections' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <Truck size={16} /> 🌾 Farmer Collections ({collectionsList.length})
        </button>

        <button
          onClick={() => setActiveTab('delivery_payouts')}
          className={`btn ${activeTab === 'delivery_payouts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <DollarSign size={16} /> 🚚 Logistics Settlement ({deliveryPayoutsList.length})
        </button>

        <button
          onClick={() => setActiveTab('hub_transfers')}
          className={`btn ${activeTab === 'hub_transfers' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <RefreshCw size={16} /> 🔄 Hub Transfers ({transfersList.length})
        </button>

        <button
          onClick={() => setActiveTab('hub_inventory')}
          className={`btn ${activeTab === 'hub_inventory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Building size={16} /> Hub Inventory ({inventoryList.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Settings size={16} /> Pricing & Logistics
        </button>

        <button
          onClick={() => { setActiveTab('ai_forecasts'); loadForecasts(); }}
          className={`btn ${activeTab === 'ai_forecasts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative', background: activeTab === 'ai_forecasts' ? 'linear-gradient(135deg, #8E44AD, #3498DB)' : undefined }}
        >
          <TrendingUp size={16} /> 🤖 AI Demand Forecast
          {forecastSummary && (forecastSummary.recommendedTransfers + forecastSummary.recommendedFarmerSupply) > 0 && (
            <span style={{ background: '#E74C3C', color: '#fff', borderRadius: '50%', padding: '2px 7px', fontSize: '0.75rem', fontWeight: 800, marginLeft: '6px' }}>
              {forecastSummary.recommendedTransfers + forecastSummary.recommendedFarmerSupply}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ANALYTICS DASHBOARD */}
      {activeTab === 'analytics' && analytics && (
        <div>
          {/* AI Demand Forecast Highlights Widget */}
          {forecastSummary && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '5px solid #8E44AD', background: 'linear-gradient(135deg, rgba(142, 68, 173, 0.08) 0%, rgba(52, 152, 219, 0.05) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 AI Demand Forecast Highlights (7-Day Projection)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Hub-wise predictive analytics & smart inventory recommendations
                  </p>
                </div>
                <button
                  onClick={() => { setActiveTab('ai_forecasts'); loadForecasts(); }}
                  className="btn btn-sm"
                  style={{ background: 'linear-gradient(135deg, #8E44AD, #3498DB)', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, border: 'none' }}
                >
                  View Full AI Forecast Center →
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>7-Day Total Demand</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8E44AD', marginTop: '2px' }}>{forecastSummary.totalPredictedDemand || 0} Kg</div>
                </div>

                <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Potential Stockouts</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: forecastSummary.potentialStockouts > 0 ? '#E74C3C' : '#2ECC71', marginTop: '2px' }}>
                    {forecastSummary.potentialStockouts || 0} Products
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Transfers</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3498DB', marginTop: '2px' }}>{forecastSummary.recommendedTransfers || 0} Hubs</div>
                </div>

                <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Farmer Replenishments</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F39C12', marginTop: '2px' }}>{forecastSummary.recommendedFarmerSupply || 0} Products</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.35rem', borderLeft: '5px solid #2ECC71' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Platform Sales</span>
                <DollarSign size={20} style={{ color: '#2ECC71' }} />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#2ECC71' }}>₹{analytics.totalRevenue.toLocaleString('en-IN')}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From {analytics.orders?.delivered || 0} completed orders</span>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem', borderLeft: '5px solid #3498DB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Distribution Hubs</span>
                <Building size={20} style={{ color: '#3498DB' }} />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#3498DB' }}>{hubsList.filter((h) => h.isActive !== false).length}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hubsList.length} total regional hubs</span>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem', borderLeft: '5px solid #F39C12' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Produce Pending Review</span>
                <Package size={20} style={{ color: '#F39C12' }} />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#F39C12' }}>{analytics.products?.pending}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Requires quality verification</span>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem', borderLeft: '5px solid #9B59B6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Registered Farmers</span>
                <Tractor size={20} style={{ color: '#9B59B6' }} />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#9B59B6' }}>{analytics.users?.farmers}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{analytics.users?.pendingFarmers} pending approval</span>
            </div>
          </div>

          {/* STEP 11: Real Financial Metrics Section */}
          {analytics.financials && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📊 Financial Breakdown & Company Gross Profit Analysis
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem', borderTop: '4px solid #2ECC71' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Company Gross Earnings</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2ECC71', margin: '4px 0' }}>
                    ₹{analytics.financials.totalCompanyGrossEarnings?.toLocaleString('en-IN') || 0}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Commission + Margin + Handling + Delivery Profit</span>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', borderTop: '4px solid #F39C12' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Farmer Produce Cost</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F39C12', margin: '4px 0' }}>
                    ₹{analytics.financials.totalFarmerProductCost?.toLocaleString('en-IN') || 0}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct payout owed to farmers</span>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', borderTop: '4px solid #3498DB' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Revenue vs Payout</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3498DB', margin: '4px 0' }}>
                    ₹{analytics.financials.totalDeliveryRevenue || 0} / ₹{analytics.financials.totalDeliveryBoyPayout || 0}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer fees collected vs Delivery Partner payouts</span>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', borderTop: '4px solid #8B5CF6' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Platform Commission</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8B5CF6', margin: '4px 0' }}>
                    ₹{analytics.financials.totalCompanyCommission?.toLocaleString('en-IN') || 0}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total platform commission collected</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.35rem', borderLeft: '5px solid #2ECC71' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Self Pickup Orders</span>
                <Package size={20} style={{ color: '#2ECC71' }} />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#2ECC71' }}>{analytics.orders?.selfPickup || 0}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{analytics.orders?.homeDelivery || 0} home delivery orders</span>
            </div>

            <div className="glass-card" style={{ padding: '1.35rem', borderLeft: '5px solid #E74C3C', cursor: 'pointer' }} onClick={() => setActiveTab('pickup_queue')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ready for Pickup</span>
                <Building size={20} style={{ color: '#E74C3C' }} />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#E74C3C' }}>{analytics.orders?.readyForPickup || 0}</div>
              <span style={{ fontSize: '0.8rem', color: '#E74C3C', fontWeight: 700 }}>Click to open Pickup Queue →</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI DEMAND FORECASTING & SMART INVENTORY */}
      {activeTab === 'ai_forecasts' && (
        <div>
          {/* Header Bar & Period Controls */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #150E28 0%, #09121B 100%)', border: '1px solid rgba(142, 68, 173, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 AI Hub Demand Forecasting & Smart Inventory
                  </h2>
                  <span className="badge" style={{ background: 'rgba(142, 68, 173, 0.25)', color: '#D5B8FF', border: '1px solid #8E44AD' }}>
                    Model: baseline-v1
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: '4px 0 0 0' }}>
                  Predictive demand intelligence separated by regional hub and product. AI provides recommendations only — Admin maintains full operational control.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '4px' }}>
                  {(['7_days', '14_days', '30_days'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setSelectedForecastPeriod(p); loadForecasts(p); }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-pill)',
                        border: 'none',
                        background: selectedForecastPeriod === p ? 'linear-gradient(135deg, #8E44AD, #3498DB)' : 'transparent',
                        color: selectedForecastPeriod === p ? '#ffffff' : '#9CA3AF',
                        fontWeight: selectedForecastPeriod === p ? 800 : 500,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {p === '7_days' ? '7 Days' : p === '14_days' ? '14 Days' : '30 Days'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRefreshForecasts}
                  disabled={refreshingForecasts}
                  className="btn btn-sm"
                  style={{ background: '#8E44AD', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} className={refreshingForecasts ? 'spin' : ''} /> {refreshingForecasts ? 'Calculating...' : '⚡ Refresh Predictions'}
                </button>
              </div>
            </div>
          </div>

          {/* AI Summary KPIs */}
          {forecastSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.15rem', borderLeft: '4px solid #8E44AD' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Forecasted Total Demand</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#8E44AD', marginTop: '3px' }}>
                  {forecastSummary.totalPredictedDemand || 0} Kg
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Across all hubs for {selectedForecastPeriod.replace('_', ' ')}</span>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', borderLeft: '4px solid #E74C3C' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Potential Stockouts</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#E74C3C', marginTop: '3px' }}>
                  {forecastSummary.potentialStockouts || 0} Products
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Est. depletion within {selectedForecastPeriod.replace('_', ' ')}</span>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', borderLeft: '4px solid #F39C12' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Predicted Stock Shortages</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#F39C12', marginTop: '3px' }}>
                  {forecastSummary.predictedShortages || 0} Items
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target stock exceeding available + incoming</span>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', borderLeft: '4px solid #3498DB' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Hub Transfers</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#3498DB', marginTop: '3px' }}>
                  {forecastSummary.recommendedTransfers || 0} Reallocations
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Surplus available at nearby hubs</span>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', borderLeft: '4px solid #2ECC71' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Farmer Replenishments Needed</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2ECC71', marginTop: '3px' }}>
                  {forecastSummary.recommendedFarmerSupply || 0} Items
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Additional farmer supply required</span>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>SELECT HUB</label>
                  <select value={selectedForecastHub} onChange={(e) => setSelectedForecastHub(e.target.value)} className="form-select" style={{ fontSize: '0.85rem', height: '36px' }}>
                    <option value="all">All Regional Hubs</option>
                    {hubsList.map((h: any) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>STATUS FILTER</label>
                  <select value={forecastStatusFilter} onChange={(e) => setForecastStatusFilter(e.target.value)} className="form-select" style={{ fontSize: '0.85rem', height: '36px' }}>
                    <option value="all">All Items</option>
                    <option value="recommended">⭐ AI Recommendations Only</option>
                    <option value="stockout">⚠️ Potential Stockouts Only</option>
                    <option value="shortage">🔴 Shortages Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>CATEGORY</label>
                  <select value={selectedForecastCategory} onChange={(e) => setSelectedForecastCategory(e.target.value)} className="form-select" style={{ fontSize: '0.85rem', height: '36px' }}>
                    <option value="all">All Categories</option>
                    {Array.from(new Set(productsList.map((p) => p.category || 'Vegetables'))).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>SEARCH</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search product or hub..."
                    value={forecastSearch}
                    onChange={(e) => setForecastSearch(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem', paddingLeft: '2.2rem', height: '36px', width: '220px' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Forecast Table */}
          {(() => {
            let filtered = forecastsList;
            if (selectedForecastHub !== 'all') filtered = filtered.filter((f) => f.hubId === selectedForecastHub);
            if (selectedForecastCategory !== 'all') filtered = filtered.filter((f) => f.category?.toLowerCase() === selectedForecastCategory.toLowerCase());
            if (forecastSearch.trim()) {
              const q = forecastSearch.toLowerCase();
              filtered = filtered.filter((f) => f.productName.toLowerCase().includes(q) || f.hubName.toLowerCase().includes(q));
            }
            if (forecastStatusFilter === 'recommended') filtered = filtered.filter((f) => f.recommendedReplenishment > 0 && !f.isIgnored);
            else if (forecastStatusFilter === 'stockout') filtered = filtered.filter((f) => f.stockoutDays !== undefined && f.stockoutDays <= 7);
            else if (forecastStatusFilter === 'shortage') filtered = filtered.filter((f) => f.predictedShortage > 0);

            if (filtered.length === 0) {
              return (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <TrendingUp size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <h4 style={{ margin: 0, fontWeight: 700 }}>No forecast entries match the selected filters</h4>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your filters or click Refresh Predictions.</p>
                </div>
              );
            }

            return (
              <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem' }}>Product & Category</th>
                      <th style={{ padding: '0.85rem' }}>Regional Hub</th>
                      <th style={{ padding: '0.85rem' }}>Stock On-Hand</th>
                      <th style={{ padding: '0.85rem' }}>{selectedForecastPeriod.replace('_', ' ')} Forecast</th>
                      <th style={{ padding: '0.85rem' }}>Stock Balance</th>
                      <th style={{ padding: '0.85rem' }}>AI Confidence</th>
                      <th style={{ padding: '0.85rem' }}>Smart Recommendation</th>
                      <th style={{ padding: '0.85rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => {
                      const isStockout = f.stockoutDays !== undefined && f.stockoutDays <= 7;
                      const hasShortage = f.predictedShortage > 0;

                      return (
                        <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: f.isIgnored ? 0.6 : 1 }}>
                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>📦 {f.productName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.category} • {f.unit}</div>
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 700 }}>🏭 {f.hubName}</div>
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 800, color: f.currentStock === 0 ? '#E74C3C' : 'var(--text-primary)' }}>
                              Available: {f.currentStock} {f.unit}
                            </div>
                            {f.confirmedIncoming > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#3498DB', fontWeight: 700 }}>
                                + Incoming: {f.confirmedIncoming} {f.unit}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 900, color: '#8E44AD', fontSize: '0.95rem' }}>
                              {f.predictedQuantity} {f.unit}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Retail: {f.retailDemand} | Wholesale: {f.wholesaleDemand}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            {hasShortage ? (
                              <div style={{ color: '#E74C3C', fontWeight: 800 }}>
                                🔴 Shortage: {f.predictedShortage} {f.unit}
                              </div>
                            ) : (
                              <div style={{ color: '#2ECC71', fontWeight: 800 }}>
                                ✅ Remainder: {f.expectedRemaining} {f.unit}
                              </div>
                            )}
                            {isStockout && (
                              <span className="badge badge-danger" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                                ⚠️ Depleted in ~{f.stockoutDays} days
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <span
                              className={`badge ${
                                f.confidence === 'High' ? 'badge-success' : f.confidence === 'Medium' ? 'badge-warning' : 'badge-secondary'
                              }`}
                            >
                              {f.confidence} ({Math.round((f.confidenceScore || 0.8) * 100)}%)
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {f.dataQualityStatus}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem', maxWidth: '240px' }}>
                            {f.recommendedReplenishment > 0 ? (
                              f.recommendationType === 'HUB_TRANSFER' ? (
                                <div>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#3498DB', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    🔄 Transfer {f.recommendedReplenishment} {f.unit}
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    From: <strong>{f.recommendedSourceHubName}</strong>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F39C12', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    🌾 Farmer Supply {f.recommendedReplenishment} {f.unit}
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    Issue farmer collection request
                                  </div>
                                </div>
                              )
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#2ECC71', fontWeight: 700 }}>
                                ✅ Stock level optimal
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {f.recommendedReplenishment > 0 && !f.acceptedAt && !f.isIgnored && (
                                <button
                                  onClick={() => handleAcceptRecommendation(f)}
                                  className="btn btn-success btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                >
                                  [Accept]
                                </button>
                              )}

                              {f.acceptedAt && (
                                <span style={{ fontSize: '0.72rem', color: '#2ECC71', fontWeight: 800 }}>
                                  ✓ Accepted
                                </span>
                              )}

                              <button
                                onClick={() => setSelectedForecastModal(f)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                              >
                                <Eye size={12} /> AI Reason
                              </button>

                              {f.recommendedReplenishment > 0 && !f.acceptedAt && !f.isIgnored && (
                                <button
                                  onClick={() => handleIgnoreRecommendation(f)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '3px 6px', color: '#9CA3AF' }}
                                  title="Ignore recommendation"
                                >
                                  Ignore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB: HUB PICKUP QUEUE */}
      {activeTab === 'pickup_queue' && (() => {
        const selfPickupOrders = ordersList.filter((o: any) => o.deliveryMethod === 'self_pickup');
        const filteredPickup = pickupHubFilter === 'all' ? selfPickupOrders : selfPickupOrders.filter((o: any) => (o.hubId || o.deliveryHubId) === pickupHubFilter);
        const activePickup = filteredPickup.filter((o: any) => !['Completed', 'Cancelled', 'Delivered'].includes(o.orderStatus));
        const completedPickup = filteredPickup.filter((o: any) => o.orderStatus === 'Completed');

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={22} style={{ color: '#2ECC71' }} /> Hub Self Pickup Queue
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Manage self-pickup orders — mark ready and verify customer collection with OTP
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={pickupHubFilter}
                  onChange={(e) => setPickupHubFilter(e.target.value)}
                  className="form-select"
                  style={{ fontSize: '0.85rem', height: '38px', minWidth: '200px' }}
                >
                  <option value="all">All Hubs ({selfPickupOrders.length})</option>
                  {hubsList.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({selfPickupOrders.filter((o: any) => (o.hubId || o.deliveryHubId) === h.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hub Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[{label: 'Confirmed', color: '#F39C12'}, {label: 'Hub Processing', color: '#8E44AD'}, {label: 'Ready for Pickup', color: '#E74C3C'}, {label: 'Completed', color: '#2ECC71'}].map(({label, color}) => (
                <div key={label} className="glass-card" style={{ padding: '1rem', borderLeft: `4px solid ${color}` }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color }}>
                    {filteredPickup.filter((o: any) => o.orderStatus === label).length}
                  </div>
                </div>
              ))}
            </div>

            {/* Active Self Pickup Orders */}
            {activePickup.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Package size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No active self-pickup orders in queue.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                  Active Pickup Queue ({activePickup.length})
                </h4>
                {activePickup.map((ord: any) => {
                  const isReadyForPickup = ord.orderStatus === 'Ready for Pickup';
                  return (
                    <div key={ord.id} className="glass-card" style={{
                      padding: '1.25rem 1.5rem',
                      border: `1px solid ${isReadyForPickup ? 'rgba(231, 76, 60, 0.5)' : 'rgba(46, 204, 113, 0.3)'}`,
                      background: isReadyForPickup ? 'linear-gradient(135deg, rgba(231,76,60,0.06) 0%, var(--bg-card-solid) 100%)' : 'var(--bg-card-solid)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}>#{ord.id}</span>
                            <span className="badge" style={{ background: isReadyForPickup ? 'rgba(231,76,60,0.2)' : 'rgba(243,156,18,0.2)', color: isReadyForPickup ? '#E74C3C' : '#F39C12', fontWeight: 800 }}>
                              {ord.orderStatus}
                            </span>
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>📦 Self Pickup</span>
                          </div>
                          <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div><strong>Customer:</strong> {ord.customerName} ({ord.customerPhone || ord.customerEmail})</div>
                            <div><strong>Pickup Hub:</strong> 🏭 {ord.hubName || ord.deliveryHubName || 'Distribution Hub'}</div>
                            <div><strong>Items:</strong> {ord.items?.map((it: any) => `${it.productName} × ${it.quantity} ${it.unit}`).join(', ')}</div>
                            <div><strong>Total:</strong> ₹{ord.grandTotal} • <strong>Delivery:</strong> ₹0 (Self Pickup)</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Placed: {new Date(ord.placedAt).toLocaleString('en-IN')}</div>
                          </div>

                          {isReadyForPickup && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(231,76,60,0.08)', borderRadius: '8px', border: '1px solid rgba(231,76,60,0.3)' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#E74C3C', marginBottom: '0.5rem' }}>🔐 Pickup Verification</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ask customer for their 4-digit verification code, then enter it below to complete pickup:</div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="Enter 4-digit code"
                                  value={pickupOtpInputs[ord.id] || ''}
                                  onChange={(e) => setPickupOtpInputs(prev => ({ ...prev, [ord.id]: e.target.value.replace(/\D/g, '') }))}
                                  className="form-input"
                                  style={{ width: '140px', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.3em', textAlign: 'center' }}
                                />
                                <button
                                  onClick={() => handleCompletePickup(ord.id)}
                                  className="btn btn-primary"
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                  <Check size={16} /> Complete Pickup
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                          {!isReadyForPickup && (
                            <button
                              onClick={() => handleMarkReadyForPickup(ord.id)}
                              className="btn btn-primary"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                            >
                              <Package size={15} /> Mark Ready for Pickup
                            </button>
                          )}
                          <span style={{ fontSize: '0.75rem', color: '#2ECC71', fontWeight: 700 }}>📦 No Delivery Boy Required</span>
                          <span style={{ fontSize: '0.75rem', color: '#2ECC71', fontWeight: 700 }}>₹0 Delivery Charge</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Pickup Orders */}
            {completedPickup.length > 0 && (
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Completed Pickups ({completedPickup.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {completedPickup.slice(0, 10).map((ord: any) => (
                    <div key={ord.id} className="glass-card" style={{ padding: '0.85rem 1.25rem', border: '1px solid rgba(46,204,113,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>#{ord.id}</span>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{ord.customerName}</span>
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem' }}>₹{ord.grandTotal}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Collected: {ord.pickupCompletedAt ? new Date(ord.pickupCompletedAt).toLocaleString('en-IN') : 'N/A'}
                        </span>
                        <span className="badge badge-success" style={{ fontWeight: 800 }}>✅ Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* TAB: DISTRIBUTION HUBS */}
      {activeTab === 'hubs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={22} style={{ color: '#2ECC71' }} /> Distribution Hubs Management
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Regional agricultural sorting centers and farm-to-customer logistics hubs</p>
            </div>

            <button onClick={handleOpenAddHubModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={18} /> Add Distribution Hub
            </button>
          </div>

          {hubsList.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Building size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No distribution hubs found.</p>
              <button onClick={handleOpenAddHubModal} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                <Plus size={16} /> Add First Hub
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
              {hubsList.map((hub) => (
                <div
                  key={hub.id}
                  className="glass-card"
                  style={{
                    padding: '1.5rem',
                    border: `1px solid ${hub.isActive !== false ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3498DB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          CODE: {hub.code}
                        </span>
                        <h4 style={{ fontWeight: 900, fontSize: '1.2rem', marginTop: '0.1rem' }}>{hub.name}</h4>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: hub.isActive !== false ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 71, 87, 0.2)',
                          color: hub.isActive !== false ? '#2ECC71' : '#FF4757',
                          fontWeight: 800,
                        }}
                      >
                        {hub.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div>📍 <strong>Location:</strong> {hub.city}, {hub.district}, {hub.state} ({hub.pincode})</div>
                      <div>🏠 <strong>Address:</strong> {hub.address}</div>
                      {hub.phone && <div>📞 <strong>Phone:</strong> {hub.phone}</div>}
                      {hub.managerName && <div>👤 <strong>Manager:</strong> {hub.managerName}</div>}
                    </div>

                    {/* Hub Logistics Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.85rem', background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Awaiting Arrival:</span>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#F39C12' }}>
                          {ordersList.filter((o) => o.hubId === hub.id && o.orderStatus === 'Pickup Complete').length}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Hub Processing:</span>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#8E44AD' }}>
                          {ordersList.filter((o) => o.hubId === hub.id && (o.orderStatus === 'Arrived at Hub' || o.orderStatus === 'Hub Processing')).length}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Dispatched:</span>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#E67E22' }}>
                          {ordersList.filter((o) => o.hubId === hub.id && o.orderStatus === 'Out for Delivery').length}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>📦 Ready for Pickup:</span>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#E74C3C' }}>
                          {ordersList.filter((o) => o.hubId === hub.id && (o.orderStatus as string) === 'Ready for Pickup').length}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Hub Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={() => handleViewHubDetail(hub)} className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => handleOpenEditHubModal(hub)} className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => handleToggleHubStatus(hub)} className={`btn btn-sm ${hub.isActive !== false ? 'btn-danger' : 'btn-primary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      {hub.isActive !== false ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: PRODUCT APPROVALS */}
      {activeTab === 'approvals' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>📦 Farm Produce Verification & Quality Control</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setProductStatusFilter('Pending Approval')} className={`btn btn-sm ${productStatusFilter === 'Pending Approval' ? 'btn-primary' : 'btn-secondary'}`}>
                Pending Approval ({pendingProductsCount})
              </button>
              <button onClick={() => setProductStatusFilter('Approved')} className={`btn btn-sm ${productStatusFilter === 'Approved' ? 'btn-primary' : 'btn-secondary'}`}>
                Approved ({productsList.filter((p) => p.status === 'Approved').length})
              </button>
              <button onClick={() => setProductStatusFilter('Rejected')} className={`btn btn-sm ${productStatusFilter === 'Rejected' ? 'btn-primary' : 'btn-secondary'}`}>
                Rejected ({productsList.filter((p) => p.status === 'Rejected').length})
              </button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No products found matching filter "{productStatusFilter}".</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflowX: 'auto', padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem' }}>Produce Details</th>
                    <th style={{ padding: '0.85rem' }}>Farmer & Location</th>
                    <th style={{ padding: '0.85rem' }}>Logistics & Transport Breakdown</th>
                    <th style={{ padding: '0.85rem' }}>Category & Organic</th>
                    <th style={{ padding: '0.85rem' }}>Price & Stock</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <img
                            src={resolveProductImage(prod.name, prod.category, prod.image, prod.id)}
                            alt={prod.name}
                            style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getCategoryFallbackSvg(prod.name, prod.category);
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{prod.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {prod.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 700 }}>{prod.farmerName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {prod.location || prod.farmerDistrict || 'Pollachi'}</div>
                      </td>

                      {/* Logistics & Transport Breakdown Column */}
                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div>🏭 <strong>Hub:</strong> {prod.assignedHubName || 'Coimbatore Distribution Hub'}</div>
                          <div>🚚 <strong>Distance:</strong> {prod.transportDistanceKm || (prod.location?.toLowerCase().includes('palani') ? 110 : prod.location?.toLowerCase().includes('erode') ? 95 : 45)} km</div>
                          <div>💰 <strong>Farmer Price:</strong> {formatCurrency(prod.farmerPrice || prod.price)} / {prod.unit}</div>
                          <div>📦 <strong>Transport:</strong> {formatCurrency(prod.farmerToHubTransportCost || ((prod.transportDistanceKm || 45) * 0.05))} • <strong>Comm:</strong> {formatCurrency(prod.companyCommissionAmount || ((prod.farmerPrice || prod.price) * 0.1))} (10%)</div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <span className="badge badge-info" style={{ marginBottom: '0.2rem', display: 'inline-block' }}>{prod.category}</span>
                        <div>
                          {prod.organic ? (
                            <span style={{ fontSize: '0.75rem', color: '#2ECC71', fontWeight: 700 }}>🌿 Organic</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conventional</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.05rem' }}>
                          ₹{prod.price} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {prod.unit}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock: {prod.stock} {prod.unit}</div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <span className={`badge ${prod.status === 'Approved' ? 'badge-success' : prod.status === 'Pending Approval' ? 'badge-warning' : 'badge-danger'}`}>
                          {prod.status}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {prod.status !== 'Approved' && (
                            <button onClick={() => handleApproveProduct(prod.id)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle size={14} /> Approve
                            </button>
                          )}
                          {prod.status !== 'Rejected' && (
                            <button onClick={() => openRejectModal(prod)} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <XCircle size={14} /> Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: ORDERS & DELIVERY BOY ASSIGNMENT */}
      {activeTab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={22} style={{ color: '#E67E22' }} /> Hub-Based Delivery Partner Assignment
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {ordersList.length} total orders across distribution hubs
            </span>
          </div>

          {ordersList.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Truck size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No customer orders found.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflowX: 'auto', padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem' }}>Order Details</th>
                    <th style={{ padding: '0.85rem' }}>Customer & Address</th>
                    <th style={{ padding: '0.85rem' }}>Delivery Method</th>
                    <th style={{ padding: '0.85rem' }}>Assigned Distribution Hub</th>
                    <th style={{ padding: '0.85rem' }}>Payment Status</th>
                    <th style={{ padding: '0.85rem' }}>Delivery Charge</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.85rem' }}>Assigned Delivery Partner</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList
                    .filter((ord: any) => orderTypeFilter === 'all' || (ord.orderType || 'retail') === orderTypeFilter)
                    .map((ord: any) => {
                    const isSelfPickup = ord.deliveryMethod === 'self_pickup';
                    const orderHubId = ord.hubId || ord.deliveryHubId || 'hub_cbe';

                    // Filter delivery partners to show ONLY those matching this order's distribution hub
                    const eligibleDeliveryPartners = usersList.filter((u: any) => {
                      if (u.role !== 'delivery') return false;
                      const partnerHubId = u.assignedHubId || (u.district?.toLowerCase().includes('chennai') ? 'hub_che' : u.district?.toLowerCase().includes('bengaluru') ? 'hub_blr' : u.district?.toLowerCase().includes('hyderabad') ? 'hub_hyd' : 'hub_cbe');
                      return partnerHubId === orderHubId;
                    });

                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>#{ord.id}</span>
                            <span className="badge" style={{ background: ord.orderType === 'wholesale' ? '#8B5CF6' : 'var(--primary)', color: '#fff', fontSize: '0.68rem' }}>
                              {ord.orderType || 'retail'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ord.items?.length || 0} items • ₹{ord.grandTotal}
                          </div>
                          <button
                            onClick={() => setSelectedFinancialOrder(ord)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 6px', marginTop: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}
                          >
                            💰 Financial Breakdown
                          </button>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontWeight: 700 }}>{ord.customerName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            📍 {ord.deliveryAddress?.street || 'Local'}, {ord.deliveryAddress?.district || 'Coimbatore'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <span
                            className="badge"
                            style={{
                              background: isSelfPickup ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                              color: isSelfPickup ? '#2ECC71' : '#3498DB',
                              fontWeight: 800,
                            }}
                          >
                            {isSelfPickup ? '📦 Self Pickup' : '🚚 Home Delivery'}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontWeight: 700 }}>🏭 {ord.hubName || ord.deliveryHubName || 'Coimbatore Hub'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Distance: {isSelfPickup ? 'Not Applicable' : `${ord.deliveryDistanceKm || 6.5} km`}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <span
                            className={`badge ${ord.paymentStatus === 'PAID' || ord.paymentStatus === 'Completed' || ord.paymentStatus === 'Paid' ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            💳 {ord.paymentStatus || 'Pending'}
                          </span>
                          {ord.transactionId && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Ref: {ord.transactionId}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <strong style={{ color: isSelfPickup ? '#2ECC71' : 'var(--text-primary)' }}>
                            {isSelfPickup ? '₹0 (FREE)' : `₹${ord.deliveryCharge || 30}`}
                          </strong>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <span className={`badge ${ord.orderStatus === 'Delivered' ? 'badge-success' : ord.orderStatus === 'Assigned' ? 'badge-info' : 'badge-warning'}`}>
                            {ord.orderStatus}
                          </span>
                          {ord.orderStatus === 'Delivered' && (
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '0.7rem', fontWeight: 800 }}>
                                ✓ OTP Verified: YES
                              </span>
                              {ord.deliveredAt && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  🕒 {new Date(ord.deliveredAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          {ord.orderStatus === 'Delivered' ? (
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10B981' }}>
                                🛵 {ord.deliveryBoyName || 'Delivery Partner'}
                              </div>
                              <span className="badge badge-success" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                                ✓ Completed & Paid (+₹60)
                              </span>
                            </div>
                          ) : isSelfPickup ? (
                            <span style={{ fontSize: '0.8rem', color: '#2ECC71', fontWeight: 700 }}>
                              📦 Not Required (Self Pickup at Hub)
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <select
                                value={selectedDeliveryBoy[ord.id] || ord.deliveryBoyId || ''}
                                onChange={(e) => setSelectedDeliveryBoy({ ...selectedDeliveryBoy, [ord.id]: e.target.value })}
                                className="form-select"
                                style={{ fontSize: '0.8rem', height: '34px', minWidth: '170px' }}
                              >
                                <option value="">-- Select Delivery Boy --</option>
                                {eligibleDeliveryPartners.map((dp: any) => (
                                  <option key={dp.id} value={dp.id}>
                                    🛵 {dp.name} ({dp.vehicleType || 'Bike'})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignDelivery(ord.id)}
                                className="btn btn-primary btn-sm"
                                style={{ height: '34px', padding: '0 0.6rem', fontSize: '0.78rem', borderRadius: '6px' }}
                              >
                                Assign
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>👥 User Account Directory & Hub Assignments</h3>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search user name, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', width: '240px', height: '36px', fontSize: '0.85rem' }}
                />
              </div>

              <select value={userRoleFilter} onChange={(e: any) => setUserRoleFilter(e.target.value)} className="form-select" style={{ height: '36px', fontSize: '0.85rem' }}>
                <option value="all">All Roles</option>
                <option value="farmer">Farmers</option>
                <option value="customer">Customers</option>
                <option value="delivery">Delivery Partners</option>
              </select>

              <select value={userStatusFilter} onChange={(e: any) => setUserStatusFilter(e.target.value)} className="form-select" style={{ height: '36px', fontSize: '0.85rem' }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem' }}>User Profile</th>
                  <th style={{ padding: '0.85rem' }}>Role</th>
                  <th style={{ padding: '0.85rem' }}>Contact & Location</th>
                  <th style={{ padding: '0.85rem' }}>Operating Hub / Details</th>
                  <th style={{ padding: '0.85rem' }}>Status</th>
                  <th style={{ padding: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={u.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt={u.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 800 }}>{u.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem' }}>
                      <span
                        className="badge"
                        style={{
                          background: u.role === 'farmer' ? 'rgba(142, 68, 173, 0.2)' : u.role === 'delivery' ? 'rgba(230, 126, 34, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                          color: u.role === 'farmer' ? '#8E44AD' : u.role === 'delivery' ? '#E67E22' : '#3498DB',
                          fontWeight: 700,
                        }}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem' }}>
                      <div>📧 {u.email}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {u.phone}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {u.district}, {u.state}</div>
                    </td>

                    <td style={{ padding: '0.85rem' }}>
                      {u.role === 'farmer' && (
                        <div>
                          <div>🌾 {u.farmName || 'Farm'} ({u.farmLocation})</div>
                          <div style={{ fontSize: '0.78rem', color: u.distributionHubName ? '#2ECC71' : 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>
                            🏭 Hub: {u.distributionHubName || 'Unassigned'}
                          </div>
                        </div>
                      )}
                      {u.role === 'delivery' && (
                        <div>
                          <div>🛵 {u.vehicleType || 'Vehicle'} ({u.vehicleNumber})</div>
                          <div style={{ fontSize: '0.78rem', color: u.distributionHubName ? '#2ECC71' : 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>
                            🏭 Hub: {u.distributionHubName || 'Unassigned'}
                          </div>
                        </div>
                      )}
                      {u.role === 'customer' && <div>🏆 Tier: {u.loyaltyTier || 'Bronze'}</div>}
                    </td>

                    <td style={{ padding: '0.85rem' }}>
                      <span className={`badge ${u.status === 'approved' ? 'badge-success' : u.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                        {u.status}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {(u.role === 'farmer' || u.role === 'delivery') && (
                          <button onClick={() => openAssignHubModal(u)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building size={14} /> Assign Hub
                          </button>
                        )}
                        {u.status !== 'approved' && (
                          <button onClick={() => handleUpdateUserStatus(u.id, 'approved')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <UserCheck size={14} /> Approve
                          </button>
                        )}
                        {u.status !== 'blocked' && (
                          <button onClick={() => handleUpdateUserStatus(u.id, 'blocked')} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <UserX size={14} /> Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT HUB MODAL */}
      {showHubModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#111218' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={20} style={{ color: '#2ECC71' }} /> {editingHub ? `Edit Hub: ${editingHub.name}` : 'Create New Distribution Hub'}
              </h3>
              <button onClick={() => setShowHubModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveHub} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Hub Name *</label>
                <input type="text" required value={hubFormData.name} onChange={(e) => setHubFormData({ ...hubFormData, name: e.target.value })} placeholder="e.g. Coimbatore Hub" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Hub Code *</label>
                <input type="text" required value={hubFormData.code} onChange={(e) => setHubFormData({ ...hubFormData, code: e.target.value.toUpperCase() })} placeholder="e.g. CBE-HUB" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">City *</label>
                <input type="text" required value={hubFormData.city} onChange={(e) => setHubFormData({ ...hubFormData, city: e.target.value })} placeholder="Coimbatore" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">District *</label>
                <input type="text" required value={hubFormData.district} onChange={(e) => setHubFormData({ ...hubFormData, district: e.target.value })} placeholder="Coimbatore" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">State</label>
                <input type="text" value={hubFormData.state} onChange={(e) => setHubFormData({ ...hubFormData, state: e.target.value })} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Pincode *</label>
                <input type="text" required value={hubFormData.pincode} onChange={(e) => setHubFormData({ ...hubFormData, pincode: e.target.value })} placeholder="641004" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Address *</label>
                <textarea rows={2} required value={hubFormData.address} onChange={(e) => setHubFormData({ ...hubFormData, address: e.target.value })} placeholder="108 Agricultural Complex, Avinashi Road..." className="form-textarea" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Contact Phone</label>
                <input type="text" value={hubFormData.phone} onChange={(e) => setHubFormData({ ...hubFormData, phone: e.target.value })} placeholder="+91 94421 10001" className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Hub Manager Name</label>
                <input type="text" value={hubFormData.managerName} onChange={(e) => setHubFormData({ ...hubFormData, managerName: e.target.value })} placeholder="Karthik Raja" className="form-input" />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="hubActiveCheck" checked={hubFormData.isActive} onChange={(e) => setHubFormData({ ...hubFormData, isActive: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#2ECC71' }} />
                <label htmlFor="hubActiveCheck" style={{ fontWeight: 700, cursor: 'pointer' }}>Hub Active Status (Available for new assignments)</label>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowHubModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingHub ? 'Save Changes' : 'Create Hub'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW HUB DETAILS MODAL */}
      {selectedHubDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#111218' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge badge-info" style={{ fontWeight: 800 }}>CODE: {selectedHubDetail.code}</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '0.25rem' }}>{selectedHubDetail.name}</h3>
              </div>
              <button onClick={() => setSelectedHubDetail(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {loadingHubDetail ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading hub operations data...</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  <div>📍 <strong>Location:</strong> {selectedHubDetail.city}, {selectedHubDetail.district}, {selectedHubDetail.state} ({selectedHubDetail.pincode})</div>
                  <div>🏠 <strong>Address:</strong> {selectedHubDetail.address}</div>
                  <div>📞 <strong>Phone:</strong> {selectedHubDetail.phone || 'N/A'}</div>
                  <div>👤 <strong>Manager:</strong> {selectedHubDetail.managerName || 'N/A'}</div>
                </div>

                <h4 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem', color: '#8E44AD' }}>
                  Assigned Farmers ({hubDetailData?.farmers?.length || 0})
                </h4>
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {hubDetailData?.farmers?.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No farmers assigned to this hub yet.</div>
                  ) : (
                    hubDetailData?.farmers?.map((f: any) => (
                      <div key={f.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><strong>🌾 {f.name}</strong> ({f.farmName || 'Farm'})</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {f.phone} | 📍 {f.district}</div>
                      </div>
                    ))
                  )}
                </div>

                <h4 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem', color: '#E67E22' }}>
                  Assigned Delivery Partners ({hubDetailData?.deliveryAgents?.length || 0})
                </h4>
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {hubDetailData?.deliveryAgents?.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No delivery partners assigned to this hub yet.</div>
                  ) : (
                    hubDetailData?.deliveryAgents?.map((d: any) => (
                      <div key={d.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><strong>🛵 {d.name}</strong> ({d.vehicleType || 'Vehicle'})</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {d.phone} | 📍 {d.district}</div>
                      </div>
                    ))
                  )}
                </div>

                <h4 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem', color: '#2ECC71' }}>
                  Active Orders ({hubDetailData?.activeOrders?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {hubDetailData?.activeOrders?.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active orders in this hub.</div>
                  ) : (
                    hubDetailData?.activeOrders?.map((o: any) => (
                      <div key={o.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><strong>Order #{o.id}</strong> ({o.customerName})</div>
                        <span className="badge badge-info">{o.orderStatus}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINANCIAL BREAKDOWN MODAL */}
      {selectedFinancialOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '2rem', background: '#111218', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                💰 Order Financial Breakdown #{selectedFinancialOrder.id}
              </h3>
              <button onClick={() => setSelectedFinancialOrder(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {selectedFinancialOrder.pricingSnapshot ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
                {/* Customer Paid Section */}
                <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Customer Payment Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Produce Subtotal:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.itemsSubtotal}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customer Delivery Charge:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.deliveryCharge}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '4px' }}>
                    <strong>Customer Grand Total:</strong><strong>₹{selectedFinancialOrder.pricingSnapshot.customerGrandTotal}</strong>
                  </div>
                </div>

                {/* Farmer Cost Section */}
                <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #F39C12' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#F39C12', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Farmer Costs & Payout</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Farmer Product Cost:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.farmerProductCost}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Farmer → Hub Transport Cost:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.farmerTransportCost}</strong></div>
                </div>

                {/* Company Earnings Section */}
                <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #8B5CF6' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#8B5CF6', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Company Margins & Commission</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Company Commission:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.companyCommission}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Retail/Wholesale Margin:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.retailOrWholesaleMargin}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Storage & Handling:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.storageHandlingCost}</strong></div>
                </div>

                {/* Delivery Logistics Section */}
                <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #3498DB' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#3498DB', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Delivery Logistics Breakdown</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customer Delivery Fee Collected:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.deliveryCharge}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery Partner Trip Payout:</span><strong>₹{selectedFinancialOrder.pricingSnapshot.deliveryBoyPayout}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3498DB' }}>
                    <span>Logistics Profit / (Deficit):</span>
                    <strong>₹{selectedFinancialOrder.pricingSnapshot.deliveryCharge - selectedFinancialOrder.pricingSnapshot.deliveryBoyPayout}</strong>
                  </div>
                </div>

                {/* Total Company Gross Earnings */}
                <div style={{ background: 'rgba(46, 204, 113, 0.12)', padding: '1rem', borderRadius: '12px', border: '1px solid #2ECC71', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: '1rem', color: '#2ECC71' }}>Net Company Gross Earnings:</span>
                  <span style={{ fontWeight: 900, fontSize: '1.3rem', color: '#2ECC71' }}>₹{selectedFinancialOrder.pricingSnapshot.companyGrossEarnings}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                ⚠️ Financial breakdown unavailable for this historical order.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setSelectedFinancialOrder(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN HUB MODAL */}
      {assigningUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: '#111218' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={20} style={{ color: '#2ECC71' }} /> Assign Hub: {assigningUser.name}
              </h3>
              <button onClick={() => setAssigningUser(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveAssignHub}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Select a primary operating regional distribution hub for {assigningUser.role.toUpperCase()} <strong>{assigningUser.name}</strong> ({assigningUser.district}):
              </p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Select Active Distribution Hub *</label>
                <select
                  value={selectedHubForUser}
                  onChange={(e) => setSelectedHubForUser(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- No Assigned Hub (Unassign) --</option>
                  {activeHubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code}) - {h.district}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setAssigningUser(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={assigningHub} className="btn btn-primary">
                  {assigningHub ? 'Saving...' : 'Save Hub Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 8: PRICING & LOGISTICS CONFIGURATION */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
          {/* Main Configuration Panel */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={24} color="var(--primary)" /> Centralized Pricing & Logistics Configuration
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  All platform retail pricing, wholesale margins, delivery distance slabs, and partner payouts are controlled from here.
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingPricingConfig(true);
                try {
                  const res = await apiFetch('/admin/pricing-config', {
                    method: 'PUT',
                    body: JSON.stringify(pricingConfigForm),
                  });
                  if (res.success) {
                    alert('🎉 Centralized Pricing & Logistics Configuration saved successfully!');
                    setPricingConfigForm(res.config);
                  } else {
                    alert(`Save failed: ${res.message}`);
                  }
                } catch (err: any) {
                  alert(err.message || 'Save failed');
                } finally {
                  setSavingPricingConfig(false);
                }
              }}
            >
              {/* Section 1: Platform Commission & Retail Margin */}
              <div style={{ marginBottom: '1.75rem', background: 'var(--bg-card-solid)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💰 Platform Commission & Retail Margin
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Company Commission Rate (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={Math.round((pricingConfigForm.companyCommissionRate || 0.10) * 1000) / 10}
                      onChange={(e) => setPricingConfigForm({ ...pricingConfigForm, companyCommissionRate: Number(e.target.value) / 100 })}
                      className="form-input"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial default: 10% (10% of farmer price)</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Customer Retail Margin (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={Math.round((pricingConfigForm.retailMarginRate || 0.15) * 1000) / 10}
                      onChange={(e) => setPricingConfigForm({ ...pricingConfigForm, retailMarginRate: Number(e.target.value) / 100 })}
                      className="form-input"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial default: 15% (applied on Base Cost)</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Wholesale Quantity Slabs */}
              <div style={{ marginBottom: '1.75rem', background: 'var(--bg-card-solid)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem', color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏷️ Wholesale Margin Slabs & Minimum Quantity
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Shopkeepers ordering in bulk receive reduced margins depending on order quantity.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  {pricingConfigForm.wholesaleSlabs?.map((slab: any, idx: number) => (
                    <div key={idx} style={{ background: 'rgba(139, 92, 246, 0.06)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#8B5CF6', marginBottom: '0.35rem' }}>
                        Slab {idx + 1}: {slab.minQty}–{slab.maxQty >= 9999 ? '100+' : slab.maxQty} units
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Margin Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={Math.round((slab.marginRate || 0.08) * 1000) / 10}
                          onChange={(e) => {
                            const newSlabs = [...pricingConfigForm.wholesaleSlabs];
                            newSlabs[idx].marginRate = Number(e.target.value) / 100;
                            setPricingConfigForm({ ...pricingConfigForm, wholesaleSlabs: newSlabs });
                          }}
                          className="form-input"
                          style={{ height: '36px', fontSize: '0.9rem', fontWeight: 800 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ maxWidth: '300px' }}>
                  <label className="form-label">Default Min Wholesale Order Qty (units)</label>
                  <input
                    type="number"
                    min="1"
                    value={pricingConfigForm.defaultMinWholesaleQuantity || 10}
                    onChange={(e) => setPricingConfigForm({ ...pricingConfigForm, defaultMinWholesaleQuantity: Number(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Section 3: Home Delivery Distance Slabs */}
              <div style={{ marginBottom: '1.75rem', background: 'var(--bg-card-solid)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem', color: '#3498DB', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🚚 Home Delivery Distance Slabs (Hub → Customer)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Delivery charges are calculated based on actual Hub-to-Customer distance.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {pricingConfigForm.deliveryDistanceSlabs?.map((slab: any, idx: number) => (
                    <div key={idx} style={{ background: 'rgba(52, 152, 219, 0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#3498DB', marginBottom: '0.35rem' }}>
                        {slab.minKm}–{slab.maxKm} km
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Charge (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={slab.charge}
                          onChange={(e) => {
                            const newSlabs = [...pricingConfigForm.deliveryDistanceSlabs];
                            newSlabs[idx].charge = Number(e.target.value);
                            setPricingConfigForm({ ...pricingConfigForm, deliveryDistanceSlabs: newSlabs });
                          }}
                          className="form-input"
                          style={{ height: '36px', fontSize: '0.9rem', fontWeight: 800 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Delivery Partner Payout & Tax */}
              <div style={{ marginBottom: '1.75rem', background: 'var(--bg-card-solid)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', color: '#2ECC71', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🛵 Delivery Partner Payout & GST
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Default Delivery Boy Trip Payout (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      value={pricingConfigForm.deliveryBoyDefaultPayout || 60}
                      onChange={(e) => setPricingConfigForm({ ...pricingConfigForm, deliveryBoyDefaultPayout: Number(e.target.value) })}
                      className="form-input"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial default: ₹60 per completed trip</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Tax Rate (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pricingConfigForm.gstPercentage || 5}
                      onChange={(e) => setPricingConfigForm({ ...pricingConfigForm, gstPercentage: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPricingConfig}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', fontWeight: 900, borderRadius: 'var(--radius-pill)' }}
              >
                {savingPricingConfig ? 'Saving Configuration...' : '💾 Save Centralized Pricing Configuration'}
              </button>
            </form>
          </div>

          {/* Interactive Live Price Calculator Preview Side Widget */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', height: 'fit-content', position: 'sticky', top: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🧮 Live Calculation Preview
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Test pricing rules with sample input parameters in real-time.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Sample Farmer Price (₹/unit)</label>
                <input
                  type="number"
                  value={previewFarmerPrice}
                  onChange={(e) => setPreviewFarmerPrice(Number(e.target.value))}
                  className="form-input"
                  style={{ height: '36px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Sample Hub → Customer Distance (km)</label>
                <input
                  type="number"
                  step="0.5"
                  value={previewDistance}
                  onChange={(e) => setPreviewDistance(Number(e.target.value))}
                  className="form-input"
                  style={{ height: '36px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Sample Wholesale Order Qty (units)</label>
                <input
                  type="number"
                  value={previewWholesaleQty}
                  onChange={(e) => setPreviewWholesaleQty(Number(e.target.value))}
                  className="form-input"
                  style={{ height: '36px' }}
                />
              </div>

              {/* Calculated Outputs */}
              {(() => {
                const commRate = pricingConfigForm.companyCommissionRate || 0.10;
                const retailMargin = pricingConfigForm.retailMarginRate || 0.15;
                const transportRate = pricingConfigForm.farmerTransportRatePerKmKg || 0.05;
                const storageCost = pricingConfigForm.storageHandlingCost || 0;

                const transportCost = Math.round((45 * transportRate) * 100) / 100;
                const commCost = Math.round((previewFarmerPrice * commRate) * 100) / 100;
                const baseCost = Math.round((previewFarmerPrice + transportCost + commCost + storageCost) * 100) / 100;

                const retailPrice = Math.round((baseCost + baseCost * retailMargin) * 100) / 100;

                // Wholesale slab lookup
                const slabs = pricingConfigForm.wholesaleSlabs || [];
                const matchedSlab = slabs.find((s: any) => previewWholesaleQty >= s.minQty && previewWholesaleQty <= s.maxQty);
                const wholesaleMargin = matchedSlab ? matchedSlab.marginRate : 0.08;
                const wholesalePrice = Math.round((baseCost + baseCost * wholesaleMargin) * 100) / 100;

                // Delivery charge lookup
                const dSlabs = pricingConfigForm.deliveryDistanceSlabs || [];
                const matchedDSlab = dSlabs.find((s: any) => previewDistance >= s.minKm && previewDistance <= s.maxKm);
                const deliveryCharge = matchedDSlab ? matchedDSlab.charge : 30;

                return (
                  <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '0.5rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Farmer Price:</span>
                      <strong>₹{previewFarmerPrice}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Farmer → Hub Transport:</span>
                      <span>₹{transportCost}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Company Commission ({(commRate * 100).toFixed(0)}%):</span>
                      <span>₹{commCost}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                      <strong>Base Cost:</strong>
                      <strong>₹{baseCost}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ECC71' }}>
                      <strong>Customer Retail Price ({(retailMargin * 100).toFixed(0)}%):</strong>
                      <strong>₹{retailPrice}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8B5CF6' }}>
                      <strong>Wholesale Price ({(wholesaleMargin * 100).toFixed(0)}%):</strong>
                      <strong>₹{wholesalePrice}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3498DB', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                      <span>Home Delivery Charge ({previewDistance} km):</span>
                      <strong>₹{deliveryCharge}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Partner Payout:</span>
                      <strong>₹{pricingConfigForm.deliveryBoyDefaultPayout || 60}</strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* TAB 9: HUB INVENTORY & BATCH MANAGEMENT */}
      {activeTab === 'hub_inventory' && (
        <div>
          {/* Hub Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {activeHubs.map((hub) => {
              const hubInv = inventoryList.filter((i) => i.hubId?.toLowerCase() === hub.id.toLowerCase());
              const totalAvailable = hubInv.reduce((sum, item) => sum + (item.quantityAvailable || 0), 0);
              const totalReserved = hubInv.reduce((sum, item) => sum + (item.quantityReserved || 0), 0);
              const lowStockCount = hubInv.filter((item) => item.quantityAvailable > 0 && item.quantityAvailable < 10).length;

              return (
                <div
                  key={hub.id}
                  onClick={() => setSelectedHubFilter(selectedHubFilter === hub.id ? 'all' : hub.id)}
                  className="glass-card"
                  style={{
                    padding: '1.35rem',
                    cursor: 'pointer',
                    borderLeft: selectedHubFilter === hub.id ? '6px solid var(--primary)' : '4px solid #3498DB',
                    background: selectedHubFilter === hub.id ? 'rgba(46, 204, 113, 0.08)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{hub.name}</h4>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{hub.code}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                    📍 {hub.district}, {hub.state}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Batches:</span> <strong>{hubInv.length}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Available:</span> <strong style={{ color: '#2ECC71' }}>{totalAvailable} units</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Reserved:</span> <strong style={{ color: '#F39C12' }}>{totalReserved} units</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Low Stock:</span> <strong style={{ color: lowStockCount > 0 ? '#E74C3C' : 'var(--text-primary)' }}>{lowStockCount} items</strong></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Bar & Header */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={22} color="var(--primary)" /> Distribution Hub Inventory & Batches
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Real-time stock tracking by batch, farmer origin, and regional distribution hub.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 'var(--radius-pill)' }}>
                  {['all', 'available', 'low_stock', 'out_of_stock'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedInventoryStatusFilter(st)}
                      className={`btn btn-sm ${selectedInventoryStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', textTransform: 'capitalize' }}
                    >
                      {st === 'all' ? 'All Status' : st === 'low_stock' ? '⚠️ Low Stock' : st === 'out_of_stock' ? '🚫 Out of Stock' : '✅ Available'}
                    </button>
                  ))}
                </div>

                <select
                  value={selectedHubFilter}
                  onChange={(e) => setSelectedHubFilter(e.target.value)}
                  className="form-select"
                  style={{ width: '210px' }}
                >
                  <option value="all">🏭 All Regional Hubs</option>
                  {activeHubs.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setShowReplenishmentModal(true);
                    if (productsList.length > 0) setReplenishProductId(productsList[0].id);
                  }}
                  className="btn btn-warning btn-sm"
                  style={{ borderRadius: 'var(--radius-pill)', fontSize: '0.78rem', background: '#F39C12', borderColor: '#F39C12' }}
                >
                  ⚠️ Request Replenishment
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem' }}>Product & Category</th>
                    <th style={{ padding: '0.85rem' }}>Hub & Batch ID</th>
                    <th style={{ padding: '0.85rem' }}>Farmer Supplier</th>
                    <th style={{ padding: '0.85rem' }}>Received</th>
                    <th style={{ padding: '0.85rem' }}>Available</th>
                    <th style={{ padding: '0.85rem' }}>Reserved</th>
                    <th style={{ padding: '0.85rem' }}>Sold</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList
                    .filter((inv: any) => selectedHubFilter === 'all' || inv.hubId?.toLowerCase() === selectedHubFilter.toLowerCase())
                    .filter((inv: any) => {
                      const thresh = inv.lowStockThreshold || 10;
                      if (selectedInventoryStatusFilter === 'available') return inv.quantityAvailable > thresh;
                      if (selectedInventoryStatusFilter === 'low_stock') return inv.quantityAvailable > 0 && inv.quantityAvailable <= thresh;
                      if (selectedInventoryStatusFilter === 'out_of_stock') return inv.quantityAvailable <= 0;
                      return true;
                    })
                    .map((inv: any) => {
                      const thresh = inv.lowStockThreshold || 10;
                      const isLowStock = inv.quantityAvailable > 0 && inv.quantityAvailable <= thresh;
                      const isDepleted = inv.quantityAvailable <= 0;

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{inv.productName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.unit} (Threshold: {thresh} {inv.unit})</div>
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 700, color: '#3498DB', fontSize: '0.82rem' }}>{inv.batchId}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              🏭 {hubsList.find((h) => h.id.toLowerCase() === inv.hubId?.toLowerCase())?.name || inv.hubId}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ fontWeight: 700 }}>👨‍🌾 {inv.farmerName}</div>
                          </td>

                          <td style={{ padding: '0.85rem', fontWeight: 700 }}>{inv.quantityReceived} {inv.unit}</td>
                          <td style={{ padding: '0.85rem', fontWeight: 900, color: isDepleted ? '#E74C3C' : isLowStock ? '#F39C12' : '#2ECC71' }}>
                            {inv.quantityAvailable} {inv.unit}
                          </td>
                          <td style={{ padding: '0.85rem', fontWeight: 800, color: '#F39C12' }}>{inv.quantityReserved} {inv.unit}</td>
                          <td style={{ padding: '0.85rem', fontWeight: 700 }}>{inv.quantitySold} {inv.unit}</td>

                          <td style={{ padding: '0.85rem' }}>
                            <span
                              className="badge"
                              style={{
                                background: isDepleted ? 'rgba(231, 76, 60, 0.2)' : isLowStock ? 'rgba(243, 156, 18, 0.2)' : 'rgba(46, 204, 113, 0.2)',
                                color: isDepleted ? '#E74C3C' : isLowStock ? '#F39C12' : '#2ECC71',
                                fontWeight: 800,
                              }}
                            >
                              {isDepleted ? '🚫 OUT_OF_STOCK' : isLowStock ? '⚠️ LOW_STOCK' : '✅ AVAILABLE'}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem' }}>
                            {(isLowStock || isDepleted) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplenishHubId(inv.hubId);
                                  setReplenishProductId(inv.productId);
                                  setShowReplenishmentModal(true);
                                }}
                                className="btn btn-warning btn-sm"
                                style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#F39C12', borderColor: '#F39C12' }}
                              >
                                [Replenish]
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE BATCH MODAL */}
      {receivingProductModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: '#111218', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                📥 Receive Farmer Shipment: {receivingProductModal.productName}
              </h3>
              <button onClick={() => setReceivingProductModal(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiFetch(`/admin/hubs/${receivingProductModal.hubId}/inventory/receive`, {
                    method: 'POST',
                    body: JSON.stringify({
                      productId: receivingProductModal.productId,
                      quantity: receiveQuantityInput,
                    }),
                  });
                  if (res.success) {
                    alert(res.message);
                    setReceivingProductModal(null);
                    loadAdminData();
                  } else {
                    alert(res.message);
                  }
                } catch (err: any) {
                  alert(err.message || 'Receive failed');
                }
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Batch ID: <strong>{receivingProductModal.batchId}</strong> • Farmer: <strong>{receivingProductModal.farmerName}</strong>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Quantity Received at Hub ({receivingProductModal.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  value={receiveQuantityInput}
                  onChange={(e) => setReceiveQuantityInput(Number(e.target.value))}
                  className="form-input"
                  style={{ fontSize: '1.1rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setReceivingProductModal(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Receipt into Hub Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TAB 10: FARMER COLLECTIONS */}
      {activeTab === 'farmer_collections' && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🌾 Farmer Produce Collection Tasks (Farm → Hub Logistics)
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Manage farmer pickup tasks, assign hub-matching delivery partners, and confirm physical stock receipt into hub inventory.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem' }}>Collection ID</th>
                  <th style={{ padding: '0.85rem' }}>Farmer & Region</th>
                  <th style={{ padding: '0.85rem' }}>Product & Expected Qty</th>
                  <th style={{ padding: '0.85rem' }}>Assigned Hub</th>
                  <th style={{ padding: '0.85rem' }}>Assigned Delivery Agent</th>
                  <th style={{ padding: '0.85rem' }}>Status</th>
                  <th style={{ padding: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collectionsList.map((col) => {
                  const hubDeliveryBoys = usersList.filter((u) => u.role === 'delivery' && (u.assignedHubId === col.hubId || u.district === col.farmerLocation));

                  return (
                    <tr key={col.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 900, color: 'var(--primary)' }}>{col.id}</td>

                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 800 }}>👨‍🌾 {col.farmerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {col.farmerLocation} Farm</div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 800 }}>📦 {col.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected: {col.expectedQuantity} {col.unit}</div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 700, color: '#3498DB' }}>🏭 {col.hubName}</div>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <select
                          value={col.deliveryBoyId || ''}
                          onChange={async (e) => {
                            const res = await apiFetch(`/admin/collections/${col.id}/assign`, {
                              method: 'PUT',
                              body: JSON.stringify({ deliveryBoyId: e.target.value }),
                            });
                            if (res.success) {
                              alert(res.message);
                              loadAdminData();
                            } else {
                              alert(res.message);
                            }
                          }}
                          className="form-select"
                          style={{ fontSize: '0.82rem', height: '34px', padding: '2px 8px' }}
                        >
                          <option value="">-- Assign Delivery Agent --</option>
                          {hubDeliveryBoys.map((dbUser) => (
                            <option key={dbUser.id} value={dbUser.id}>{dbUser.name} ({dbUser.district})</option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        <span className="badge badge-info">{col.status}</span>
                      </td>

                      <td style={{ padding: '0.85rem' }}>
                        {col.status !== 'Received at Hub' ? (
                          <button
                            onClick={() => {
                              setReceivingCollectionModal(col);
                              setActualReceivedQty(col.expectedQuantity);
                              setReceiptNotes('');
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.78rem' }}
                          >
                            📥 Receive Stock at Hub
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#2ECC71', fontWeight: 800 }}>
                            ✅ Received: {col.receivedQuantity} {col.unit}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIVE COLLECTION MODAL */}
      {receivingCollectionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: '#111218', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                📥 Confirm Hub Stock Receipt: {receivingCollectionModal.productName}
              </h3>
              <button onClick={() => setReceivingCollectionModal(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiFetch(`/admin/hubs/${receivingCollectionModal.hubId}/collections/${receivingCollectionModal.id}/receive`, {
                    method: 'POST',
                    body: JSON.stringify({
                      receivedQuantity: actualReceivedQty,
                      notes: receiptNotes,
                    }),
                  });
                  if (res.success) {
                    alert(res.message);
                    setReceivingCollectionModal(null);
                    loadAdminData();
                  } else {
                    alert(res.message);
                  }
                } catch (err: any) {
                  alert(err.message || 'Hub receipt failed');
                }
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '10px' }}>
                <div>Collection ID: <strong>{receivingCollectionModal.id}</strong></div>
                <div>Farmer: <strong>{receivingCollectionModal.farmerName}</strong> ({receivingCollectionModal.farmerLocation} Farm)</div>
                <div>Hub: <strong>{receivingCollectionModal.hubName}</strong></div>
                <div>Expected Quantity: <strong style={{ color: '#3498DB' }}>{receivingCollectionModal.expectedQuantity} {receivingCollectionModal.unit}</strong></div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Actual Received Quantity ({receivingCollectionModal.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  max={receivingCollectionModal.expectedQuantity * 2}
                  value={actualReceivedQty}
                  onChange={(e) => setActualReceivedQty(Number(e.target.value))}
                  className="form-input"
                  style={{ fontSize: '1.15rem', fontWeight: 900, color: '#2ECC71' }}
                  required
                />
                {receivingCollectionModal.expectedQuantity - actualReceivedQty > 0 && (
                  <div style={{ color: '#E74C3C', fontSize: '0.8rem', fontWeight: 800, marginTop: '4px' }}>
                    ⚠️ Shortage Detected: {receivingCollectionModal.expectedQuantity - actualReceivedQty} {receivingCollectionModal.unit} missing!
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Receipt Notes / Discrepancy Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 5 kg moisture loss during transit..."
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setReceivingCollectionModal(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Physical Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TAB 10.5: DELIVERY LOGISTICS SETTLEMENT */}
      {activeTab === 'delivery_payouts' && (
        <div>
          {/* Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3498DB' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer Delivery Charges Collected</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3498DB' }}>
                ₹{logisticsSettlementSummary?.totalCollectedCharges || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Home Delivery orders</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8B5CF6' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Delivery Boy Payouts</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8B5CF6' }}>
                ₹{logisticsSettlementSummary?.totalDeliveryPayouts || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>For completed Home Deliveries</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #F39C12' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Unsettled Payouts</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F39C12' }}>
                ₹{logisticsSettlementSummary?.pendingPayoutsAmount || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting approval or payout</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${(logisticsSettlementSummary?.netLogisticsBalance || 0) >= 0 ? '#2ECC71' : '#E74C3C'}` }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Delivery Logistics Balance</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: (logisticsSettlementSummary?.netLogisticsBalance || 0) >= 0 ? '#2ECC71' : '#E74C3C' }}>
                ₹{logisticsSettlementSummary?.netLogisticsBalance || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Charges - Payouts</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              🚚 Delivery Partner Payouts & Settlement ({deliveryPayoutsList.length})
            </h3>

            {deliveryPayoutsList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No delivery payout records created yet. Payouts are generated upon successful Home Delivery completion.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem' }}>Payout ID</th>
                      <th style={{ padding: '0.75rem' }}>Order ID</th>
                      <th style={{ padding: '0.75rem' }}>Delivery Boy</th>
                      <th style={{ padding: '0.75rem' }}>Hub</th>
                      <th style={{ padding: '0.75rem' }}>Distance</th>
                      <th style={{ padding: '0.75rem' }}>Customer Charge</th>
                      <th style={{ padding: '0.75rem' }}>Driver Payout</th>
                      <th style={{ padding: '0.75rem' }}>Net Balance</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryPayoutsList.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 800 }}>{p.id}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>#{p.orderId}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700 }}>{p.deliveryBoyName}</td>
                        <td style={{ padding: '0.75rem' }}>📍 {p.hubName}</td>
                        <td style={{ padding: '0.75rem' }}>{p.deliveryDistanceKm} km</td>
                        <td style={{ padding: '0.75rem' }}>₹{p.customerDeliveryCharge}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 800, color: '#2ECC71' }}>₹{p.deliveryBoyPayout}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 800, color: p.deliveryLogisticsBalance >= 0 ? '#2ECC71' : '#E74C3C' }}>
                          ₹{p.deliveryLogisticsBalance}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${p.status === 'PAID' ? 'badge-success' : p.status === 'APPROVED' ? 'badge-info' : 'badge-warning'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {(p.status === 'EARNED' || p.status === 'PENDING') && (
                            <button
                              onClick={async () => {
                                const res = await apiFetch(`/admin/payouts/${p.id}/approve`, { method: 'PATCH' });
                                if (res.success) {
                                  alert(res.message);
                                  loadAdminData();
                                } else alert(res.message);
                              }}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', marginRight: '4px' }}
                            >
                              Approve
                            </button>
                          )}
                          {p.status !== 'PAID' && (
                            <button
                              onClick={async () => {
                                const res = await apiFetch(`/admin/payouts/${p.id}/pay`, { method: 'PATCH' });
                                if (res.success) {
                                  alert(res.message);
                                  loadAdminData();
                                } else alert(res.message);
                              }}
                              className="btn btn-success btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 11: HUB TRANSFERS */}
      {activeTab === 'hub_transfers' && (
        <div>
          {/* Transfer Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #F39C12' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Transfer Requests</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F39C12' }}>
                {transfersList.filter((t) => t.status === 'Requested' || t.status === 'Approved').length}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3498DB' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>In Transit Shipments</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3498DB' }}>
                {transfersList.filter((t) => t.status === 'In Transit' || t.status === 'Dispatched').length}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #2ECC71' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed Inter-Hub Transfers</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2ECC71' }}>
                {transfersList.filter((t) => t.status === 'Completed' || t.status === 'Received').length}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔄 Inter-Hub Stock Transfers (Coimbatore ↔ Chennai ↔ Bengaluru ↔ Hyderabad)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Admin-controlled stock re-allocation across regional distribution hubs.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCreateTransferModal(true);
                  if (productsList.length > 0) setTransferProductId(productsList[0].id);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                ➕ Request Inter-Hub Stock Transfer
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card-solid)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem' }}>Transfer ID</th>
                    <th style={{ padding: '0.85rem' }}>Source Hub</th>
                    <th style={{ padding: '0.85rem' }}>Destination Hub</th>
                    <th style={{ padding: '0.85rem' }}>Product & Quantity</th>
                    <th style={{ padding: '0.85rem' }}>Requested Date</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                    <th style={{ padding: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfersList.map((trf) => {
                    const item = trf.items[0];

                    return (
                      <tr key={trf.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem', fontWeight: 900, color: 'var(--primary)' }}>{trf.id}</td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontWeight: 800, color: '#E74C3C' }}>🏭 {trf.sourceHubName}</div>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontWeight: 800, color: '#2ECC71' }}>🏭 {trf.destinationHubName}</div>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ fontWeight: 800 }}>📦 {item?.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity: {item?.quantity} {item?.unit}</div>
                        </td>

                        <td style={{ padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(trf.requestedAt).toLocaleDateString()}
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <span className="badge badge-info">{trf.status}</span>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {trf.status === 'Requested' && (
                              <button
                                onClick={async () => {
                                  const res = await apiFetch(`/admin/transfers/${trf.id}/approve`, { method: 'PATCH' });
                                  if (res.success) {
                                    alert(res.message);
                                    loadAdminData();
                                  } else {
                                    alert(res.message);
                                  }
                                }}
                                className="btn btn-success btn-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                [Approve]
                              </button>
                            )}

                            {trf.status === 'Approved' && (
                              <button
                                onClick={async () => {
                                  const res = await apiFetch(`/admin/transfers/${trf.id}/dispatch`, { method: 'PATCH' });
                                  if (res.success) {
                                    alert(res.message);
                                    loadAdminData();
                                  } else {
                                    alert(res.message);
                                  }
                                }}
                                className="btn btn-warning btn-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                [Dispatch]
                              </button>
                            )}

                            {(trf.status === 'In Transit' || trf.status === 'Dispatched') && (
                              <button
                                onClick={() => {
                                  setReceivingTransferModal(trf);
                                  setActualTransferReceivedQty(item?.quantity || 50);
                                  setTransferReceiptNotes('');
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                📥 Receive at Dest Hub
                              </button>
                            )}

                            {(trf.status === 'Completed' || trf.status === 'Received') && (
                              <span style={{ fontSize: '0.78rem', color: '#2ECC71', fontWeight: 800 }}>
                                ✅ Received: {trf.items[0]?.quantity} {trf.items[0]?.unit}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TRANSFER REQUEST MODAL */}
      {showCreateTransferModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: '#111218', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                🔄 Request Inter-Hub Stock Transfer
              </h3>
              <button onClick={() => setShowCreateTransferModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiFetch('/admin/transfers/create', {
                    method: 'POST',
                    body: JSON.stringify({
                      sourceHubId: transferSourceHub,
                      destinationHubId: transferDestHub,
                      productId: transferProductId,
                      quantity: transferQuantityInput,
                      notes: transferNotesInput,
                    }),
                  });
                  if (res.success) {
                    alert(res.message);
                    setShowCreateTransferModal(false);
                    loadAdminData();
                  } else {
                    alert(res.message);
                  }
                } catch (err: any) {
                  alert(err.message || 'Transfer request failed');
                }
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Source Hub *</label>
                  <select value={transferSourceHub} onChange={(e) => setTransferSourceHub(e.target.value)} className="form-select" required>
                    {activeHubs.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Hub *</label>
                  <select value={transferDestHub} onChange={(e) => setTransferDestHub(e.target.value)} className="form-select" required>
                    {activeHubs.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Select Product to Transfer *</label>
                <select value={transferProductId} onChange={(e) => setTransferProductId(e.target.value)} className="form-select" required>
                  {productsList.map((p) => {
                    const avail = inventoryList.find((inv) => inv.hubId?.toLowerCase() === transferSourceHub.toLowerCase() && inv.productId === p.id)?.quantityAvailable || 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (Source Avail: {avail} {p.unit})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Transfer Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={transferQuantityInput}
                  onChange={(e) => setTransferQuantityInput(Number(e.target.value))}
                  className="form-input"
                  style={{ fontSize: '1.1rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Transfer Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. High demand surge in Chennai Hub..."
                  value={transferNotesInput}
                  onChange={(e) => setTransferNotesInput(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowCreateTransferModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Transfer Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE TRANSFER MODAL */}
      {receivingTransferModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: '#111218', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                📥 Confirm Destination Hub Transfer Receipt
              </h3>
              <button onClick={() => setReceivingTransferModal(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiFetch(`/admin/transfers/${receivingTransferModal.id}/receive`, {
                    method: 'POST',
                    body: JSON.stringify({
                      receivedQuantity: actualTransferReceivedQty,
                      notes: transferReceiptNotes,
                    }),
                  });
                  if (res.success) {
                    alert(res.message);
                    setReceivingTransferModal(null);
                    loadAdminData();
                  } else {
                    alert(res.message);
                  }
                } catch (err: any) {
                  alert(err.message || 'Transfer receipt failed');
                }
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '10px' }}>
                <div>Transfer ID: <strong>{receivingTransferModal.id}</strong></div>
                <div>Source Hub: <strong style={{ color: '#E74C3C' }}>{receivingTransferModal.sourceHubName}</strong></div>
                <div>Destination Hub: <strong style={{ color: '#2ECC71' }}>{receivingTransferModal.destinationHubName}</strong></div>
                <div>Dispatched Quantity: <strong style={{ color: '#3498DB' }}>{receivingTransferModal.items[0]?.quantity} {receivingTransferModal.items[0]?.unit}</strong></div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Actual Received Quantity at Dest Hub ({receivingTransferModal.items[0]?.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  value={actualTransferReceivedQty}
                  onChange={(e) => setActualTransferReceivedQty(Number(e.target.value))}
                  className="form-input"
                  style={{ fontSize: '1.15rem', fontWeight: 900, color: '#2ECC71' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Receipt Notes / Discrepancy Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 2 kg transit damage..."
                  value={transferReceiptNotes}
                  onChange={(e) => setTransferReceiptNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setReceivingTransferModal(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Physical Receipt into Dest Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* REPLENISHMENT REQUEST MODAL */}
      {showReplenishmentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: '#111218', border: '1px solid #F39C12' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F39C12', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                ⚠️ Request Hub Stock Replenishment
              </h3>
              <button onClick={() => setShowReplenishmentModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await apiFetch('/admin/replenishments/create', {
                    method: 'POST',
                    body: JSON.stringify({
                      hubId: replenishHubId,
                      productId: replenishProductId,
                      requestedQuantity: replenishQtyInput,
                      sourceType: replenishSourceType,
                      sourceHubId: replenishSourceType === 'HUB_TRANSFER' ? replenishSourceHubId : undefined,
                      notes: replenishNotesInput,
                    }),
                  });
                  if (res.success) {
                    alert(res.message);
                    setShowReplenishmentModal(false);
                    loadAdminData();
                  } else {
                    alert(res.message);
                  }
                } catch (err: any) {
                  alert(err.message || 'Replenishment request failed');
                }
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Destination Hub *</label>
                  <select value={replenishHubId} onChange={(e) => setReplenishHubId(e.target.value)} className="form-select" required>
                    {activeHubs.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Product *</label>
                  <select value={replenishProductId} onChange={(e) => setReplenishProductId(e.target.value)} className="form-select" required>
                    {productsList.map((p) => {
                      const avail = inventoryList.find((inv) => inv.hubId?.toLowerCase() === replenishHubId.toLowerCase() && inv.productId === p.id)?.quantityAvailable || 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current: {avail} {p.unit})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Fulfillment Source Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.65rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: replenishSourceType === 'FARMER_SUPPLY' ? '2px solid var(--primary)' : '1px solid transparent' }}>
                    <input
                      type="radio"
                      name="sourceType"
                      checked={replenishSourceType === 'FARMER_SUPPLY'}
                      onChange={() => setReplenishSourceType('FARMER_SUPPLY')}
                    />
                    🌾 Farmer Supply
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.65rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: replenishSourceType === 'HUB_TRANSFER' ? '2px solid var(--primary)' : '1px solid transparent' }}>
                    <input
                      type="radio"
                      name="sourceType"
                      checked={replenishSourceType === 'HUB_TRANSFER'}
                      onChange={() => setReplenishSourceType('HUB_TRANSFER')}
                    />
                    🔄 Hub Transfer
                  </label>
                </div>
              </div>

              {replenishSourceType === 'HUB_TRANSFER' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Select Source Hub *</label>
                  <select value={replenishSourceHubId} onChange={(e) => setReplenishSourceHubId(e.target.value)} className="form-select" required>
                    {activeHubs.filter((h) => h.id.toLowerCase() !== replenishHubId.toLowerCase()).map((h) => {
                      const avail = inventoryList.find((inv) => inv.hubId?.toLowerCase() === h.id.toLowerCase() && inv.productId === replenishProductId)?.quantityAvailable || 0;
                      return (
                        <option key={h.id} value={h.id}>
                          {h.name} (Available: {avail})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Replenishment Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={replenishQtyInput}
                  onChange={(e) => setReplenishQtyInput(Number(e.target.value))}
                  className="form-input"
                  style={{ fontSize: '1.1rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Demand spike during upcoming festival weekend..."
                  value={replenishNotesInput}
                  onChange={(e) => setReplenishNotesInput(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowReplenishmentModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#F39C12', borderColor: '#F39C12' }}>Submit Replenishment Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {rejectingProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', padding: '2rem', background: '#111218', border: '1px solid #FF4757' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FF4757', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} /> Reject Produce: {rejectingProduct.name}
              </h3>
              <button onClick={() => setRejectingProduct(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleConfirmRejectProduct}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Please specify the quality or policy reason for rejecting <strong>{rejectingProduct.farmerName}</strong>'s produce submission:
              </p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Fails organic pesticide compliance test..."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setRejectingProduct(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <XCircle size={16} /> Reject & Notify Farmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* AI FORECAST EXPLANATION MODAL */}
      {selectedForecastModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '2rem', background: '#111218', border: '1px solid #8E44AD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D5B8FF', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                🤖 AI Forecast Explanation & Analysis
              </h3>
              <button onClick={() => setSelectedForecastModal(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ background: 'rgba(142, 68, 173, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(142, 68, 173, 0.3)' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff' }}>📦 {selectedForecastModal.productName}</div>
              <div style={{ fontSize: '0.85rem', color: '#D5B8FF', marginTop: '2px' }}>
                Regional Hub: <strong>{selectedForecastModal.hubName}</strong> ({selectedForecastModal.forecastPeriod.replace('_', ' ')})
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>PREDICTED DEMAND</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#8E44AD', marginTop: '2px' }}>{selectedForecastModal.predictedQuantity} {selectedForecastModal.unit}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Retail: {selectedForecastModal.retailDemand} | Wholesale: {selectedForecastModal.wholesaleDemand}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TARGET STOCK (WITH 20% SAFETY)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#3498DB', marginTop: '2px' }}>{selectedForecastModal.predictedQuantity + selectedForecastModal.safetyStock} {selectedForecastModal.unit}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Safety Buffer: {selectedForecastModal.safetyStock} {selectedForecastModal.unit}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                AI REASONING & DATA ANALYSIS
              </label>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {selectedForecastModal.explanation}
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
              <div>Confidence: <strong style={{ color: selectedForecastModal.confidence === 'High' ? '#2ECC71' : '#F39C12' }}>{selectedForecastModal.confidence} ({Math.round((selectedForecastModal.confidenceScore || 0.8) * 100)}%)</strong></div>
              <div>Data Quality: <strong>{selectedForecastModal.dataQualityStatus}</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedForecastModal(null)} className="btn btn-secondary">Close</button>
              {selectedForecastModal.recommendedReplenishment > 0 && !selectedForecastModal.acceptedAt && (
                <button
                  type="button"
                  onClick={() => {
                    const f = selectedForecastModal;
                    setSelectedForecastModal(null);
                    handleAcceptRecommendation(f);
                  }}
                  className="btn btn-primary"
                  style={{ background: '#2ECC71', borderColor: '#2ECC71' }}
                >
                  Accept Recommendation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

