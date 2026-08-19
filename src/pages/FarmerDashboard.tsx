import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import {
  Tractor,
  Upload,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Leaf,
  Sparkles,
  Edit2,
  Trash2,
  Image as ImageIcon,
  UserCheck,
  MapPin,
  Phone,
  Building,
  RefreshCw,
  AlertTriangle,
  FileText,
  X,
  Check,
  ArrowLeft,
  LayoutDashboard,
  ShoppingBag,
  TrendingUp,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Eye,
  Menu,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  Award,
  ShieldCheck,
  Download,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { WeatherWidget } from '../components/WeatherWidget';

// 16 Categories required by prompt
const categories = [
  'Vegetables',
  'Fruits',
  'Dry Fruits',
  'Greens',
  'Organic Products',
  'Rice',
  'Pulses',
  'Spices',
  'Flowers',
  'Seeds',
  'Milk Products',
  'Honey',
  'Eggs',
  'Oils',
  'Herbs',
  'Others',
];

export const FarmerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, updateUser, logout } = useAuth();

  // Active Tab State
  type TabType =
    | 'dashboard'
    | 'products'
    | 'upload'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'orders'
    | 'earnings'
    | 'notifications'
    | 'profile'
    | 'settings';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle

  // Main Data States
  const [farmerProducts, setFarmerProducts] = useState<any[]>([]);
  const [farmerOrders, setFarmerOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    totalOrders: 0,
    totalEarnings: 0,
    totalStock: 0,
  });

  // Modal States
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [updating, setUpdating] = useState(false);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    farmName: user?.farmName || '',
    farmLocation: user?.farmLocation || '',
    address: user?.address || '',
    village: 'Pollachi Rural',
    district: user?.district || 'Coimbatore',
    state: user?.state || 'Tamil Nadu',
    pincode: user?.pincode || '641001',
    description: 'Specializing in 100% natural, chemical-free pesticide-free farming.',
    experience: '8 Years',
    productsGrown: 'Tomatoes, Bananas, Rice, Spices, Milk',
    organicStatus: 'Verified Organic',
    profileImage: user?.profileImage || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Settings State
  const [settingsData, setSettingsData] = useState({
    emailAlerts: true,
    smsAlerts: true,
    orderPushNotifications: true,
    dailySummaryDigest: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [settingsMessage, setSettingsMessage] = useState('');

  // Upload Form State
  const [uploadData, setUploadData] = useState({
    name: '',
    category: 'Vegetables',
    description: '',
    price: '',
    unit: 'Per kg',
    stock: '50',
    stockUnit: 'Kg',
    harvestDate: new Date().toISOString().split('T')[0],
    availabilityDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    organic: true,
    location: user?.farmLocation || user?.address || 'Pollachi, Coimbatore',
    availabilityStatus: 'Available',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
        farmName: user.farmName || prev.farmName,
        farmLocation: user.farmLocation || prev.farmLocation,
        address: user.address || prev.address,
        district: user.district || prev.district,
        state: user.state || prev.state,
        pincode: user.pincode || prev.pincode,
        profileImage: user.profileImage || prev.profileImage,
      }));
    }
  }, [user]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      const [prodRes, orderRes, notifRes] = await Promise.all([
        apiFetch('/products/my-products'),
        apiFetch('/orders'),
        apiFetch('/notifications'),
      ]);

      let prods: any[] = [];
      let ords: any[] = [];

      if (prodRes.success) {
        prods = prodRes.all || [];
        setFarmerProducts(prods);
      }

      if (orderRes.success) {
        ords = orderRes.orders || [];
        setFarmerOrders(ords);
      }

      if (notifRes.success) {
        setNotifications(notifRes.notifications || []);
      }

      // Calculate aggregates
      const appCount = prods.filter((p) => p.status === 'Approved').length;
      const pendCount = prods.filter((p) => p.status === 'Pending Approval').length;
      const rejCount = prods.filter((p) => p.status === 'Rejected').length;
      const totalStk = prods.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
      const totalEarn = ords.reduce((sum, o) => sum + (Number(o.grandTotal || o.subtotal) || 0), 0);

      setStats({
        total: prods.length,
        approvedCount: appCount,
        pendingCount: pendCount,
        rejectedCount: rejCount,
        totalOrders: ords.length,
        totalEarnings: totalEarn,
        totalStock: totalStk,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmerData();
  }, []);

  // Image Upload Handler
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      const data = await apiFetch('/products/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (data.success && data.imageUrl) {
        if (isEditMode) {
          setEditFormData((prev: any) => ({ ...prev, image: data.imageUrl }));
        } else {
          setUploadData((prev) => ({ ...prev, image: data.imageUrl }));
        }
      } else {
        alert(data.message || 'Image upload failed');
      }
    } catch (err: any) {
      alert(`Error uploading image: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Product Creation
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadMessage('');

    try {
      const payload = {
        name: uploadData.name,
        category: uploadData.category,
        description: uploadData.description,
        price: uploadData.price,
        unit: uploadData.unit.replace('Per ', '').trim() || 'Kg',
        stock: uploadData.stock,
        organic: uploadData.organic,
        image: uploadData.image,
        harvestDate: uploadData.harvestDate,
        availabilityDate: uploadData.availabilityDate,
        expiryDate: uploadData.expiryDate,
        location: uploadData.location,
        status: 'Pending Approval',
      };

      const res = await apiFetch('/products/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setUploadMessage('Product submitted successfully and is waiting for admin approval.');
        setUploadData({
          name: '',
          category: 'Vegetables',
          description: '',
          price: '',
          unit: 'Per kg',
          stock: '50',
          stockUnit: 'Kg',
          harvestDate: new Date().toISOString().split('T')[0],
          availabilityDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
          organic: true,
          location: user?.farmLocation || user?.address || 'Pollachi, Coimbatore',
          availabilityStatus: 'Available',
          image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
        });
        loadFarmerData();
        setTimeout(() => setActiveTab('pending'), 1500);
      } else {
        setUploadMessage(`Error: ${res.message}`);
      }
    } catch (err: any) {
      setUploadMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Open Edit Modal
  const handleStartEdit = (product: any) => {
    setEditingProduct(product);
    setEditFormData({ ...product });
  };

  // Submit Product Update (Resubmit if rejected)
  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setUpdating(true);

    try {
      const res = await apiFetch(`/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editFormData,
          status: 'Pending Approval', // Re-submitting puts back to Pending Approval
        }),
      });

      if (res.success) {
        alert('Product updated successfully! Sent to Admin for review.');
        setEditingProduct(null);
        loadFarmerData();
      } else {
        alert(`Failed to update: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      const res = await apiFetch(`/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.success) {
        alert('Product deleted successfully.');
        loadFarmerData();
      } else {
        alert(res.message || 'Could not delete product.');
      }
    } catch (err: any) {
      alert(`Error deleting product: ${err.message}`);
    }
  };

  // Order Status Update Handler
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.success) {
        alert(`Order #${orderId} status updated to ${newStatus}`);
        loadFarmerData();
      } else {
        alert(res.message || 'Failed to update order status');
      }
    } catch (err: any) {
      alert(`Error updating order status: ${err.message}`);
    }
  };

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');

    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (res.success) {
        setProfileMessage('✅ Profile updated successfully!');
        if (updateUser) updateUser(res.user);
      } else {
        setProfileMessage(`Error: ${res.message}`);
      }
    } catch (err: any) {
      setProfileMessage(`Error: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Mark Notification Read
  const handleMarkNotifRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      for (const n of notifications.filter((x) => !x.read)) {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered lists
  const pendingProducts = farmerProducts.filter((p) => p.status === 'Pending Approval');
  const approvedProducts = farmerProducts.filter((p) => p.status === 'Approved');
  const rejectedProducts = farmerProducts.filter((p) => p.status === 'Rejected');

  let filteredProducts = farmerProducts;
  if (selectedCategoryFilter !== 'All') {
    filteredProducts = filteredProducts.filter((p) => p.category === selectedCategoryFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }

  let filteredOrders = farmerOrders;
  if (orderStatusFilter !== 'All') {
    filteredOrders = filteredOrders.filter((o) => o.orderStatus === orderStatusFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.items?.some((i: any) => i.productName?.toLowerCase().includes(q))
    );
  }

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Chart Sample Data
  const chartData = {
    daily: [
      { label: 'Mon', sales: 1200, orders: 4, earnings: 1100 },
      { label: 'Tue', sales: 1850, orders: 6, earnings: 1700 },
      { label: 'Wed', sales: 2400, orders: 8, earnings: 2200 },
      { label: 'Thu', sales: 1900, orders: 5, earnings: 1750 },
      { label: 'Fri', sales: 3100, orders: 11, earnings: 2900 },
      { label: 'Sat', sales: 4200, orders: 14, earnings: 3950 },
      { label: 'Sun', sales: 3800, orders: 12, earnings: 3500 },
    ],
    weekly: [
      { label: 'Week 1', sales: 12500, orders: 38, earnings: 11800 },
      { label: 'Week 2', sales: 16800, orders: 52, earnings: 15900 },
      { label: 'Week 3', sales: 14200, orders: 44, earnings: 13400 },
      { label: 'Week 4', sales: 21500, orders: 68, earnings: 20200 },
    ],
    monthly: [
      { label: 'May', sales: 48000, orders: 140, earnings: 45000 },
      { label: 'Jun', sales: 56000, orders: 175, earnings: 53000 },
      { label: 'Jul', sales: 62000, orders: 190, earnings: 58500 },
      { label: 'Aug', sales: 74000, orders: 230, earnings: 70000 },
    ],
  };

  const currentChartBars = chartData[chartPeriod];
  const maxBarValue = Math.max(...currentChartBars.map((b) => b.sales), 1);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Sidebar Overlay Backdrop for Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 990 }}
        />
      )}

      {/* 1. LEFT SIDEBAR */}
      <aside
        style={{
          width: '260px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          transform: sidebarOpen || window.innerWidth > 992 ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)' }}>
            <Tractor size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#ffffff' }}>AgriConnect AI</div>
            <div style={{ fontSize: '0.725rem', color: '#2ECC71', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Farmer Portal</div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'products', label: 'My Products', icon: Package, badge: farmerProducts.length },
            { id: 'upload', label: 'Add Product', icon: Plus, highlight: true },
            { id: 'pending', label: 'Pending Approval', icon: Clock, badge: stats.pendingCount, badgeColor: '#E67E22' },
            { id: 'approved', label: 'Approved Products', icon: CheckCircle, badge: stats.approvedCount, badgeColor: '#2ECC71' },
            { id: 'rejected', label: 'Rejected Products', icon: XCircle, badge: stats.rejectedCount, badgeColor: '#FF4757' },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: farmerOrders.length, badgeColor: '#3498DB' },
            { id: 'earnings', label: 'Earnings', icon: DollarSign },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifCount, badgeColor: '#E67E22' },
            { id: 'profile', label: 'Profile', icon: UserCheck },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.25) 0%, rgba(39, 174, 96, 0.15) 100%)' : item.highlight ? 'rgba(46, 204, 113, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(46, 204, 113, 0.4)' : item.highlight ? '1px dashed rgba(46, 204, 113, 0.3)' : '1px solid transparent',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <IconComp size={18} style={{ color: isActive ? '#2ECC71' : item.highlight ? '#2ECC71' : 'var(--text-muted)' }} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      background: item.badgeColor || 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#FF4757',
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.2)',
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* 2. MAIN CONTENT CONTAINER */}
      <div style={{ flex: 1, marginLeft: window.innerWidth > 992 ? '260px' : '0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '70px',
            background: 'var(--bg-header)',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 900,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn btn-secondary btn-sm"
              style={{ display: window.innerWidth <= 992 ? 'flex' : 'none' }}
            >
              <Menu size={20} />
            </button>

            {/* Global Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, orders..."
                className="form-input"
                style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem', borderRadius: 'var(--radius-pill)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setActiveTab('upload')}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> <span style={{ display: window.innerWidth < 600 ? 'none' : 'inline' }}>Add Product</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('notifications')}
              style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', padding: '0.55rem', borderRadius: '50%', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: '#FF4757',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    border: '2px solid var(--bg-header)',
                  }}
                >
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Farmer Avatar & Info */}
            <div
              onClick={() => setActiveTab('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,0.03)' }}
            >
              <img
                src={user?.profileImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt={user?.name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2ECC71' }}
              />
              <div style={{ display: window.innerWidth < 600 ? 'none' : 'block' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, lineHeight: 1.2 }}>{user?.name || 'Farmer'}</div>
                <div style={{ fontSize: '0.725rem', color: '#2ECC71', fontWeight: 600 }}>Organic Farmer</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body Area */}
        <main style={{ padding: '1.75rem', flex: 1 }}>
          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Welcome Heading Banner */}
              <div
                className="glass-card"
                style={{
                  padding: '2rem',
                  marginBottom: '2rem',
                  background: 'linear-gradient(135deg, #111218 0%, #0D0E14 100%)',
                  color: '#ffffff',
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(46, 204, 113, 0.15)', color: '#2ECC71', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    <Sparkles size={14} /> Verified Direct Farmer-to-Consumer Platform
                  </div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.35rem' }}>
                    Welcome back, {user?.name || 'Farmer'} 👋
                  </h1>
                  <p style={{ color: '#9CA3AF', fontSize: '0.95rem' }}>
                    Here is your farm produce performance and direct customer sales overview today.
                  </p>
                </div>
              </div>

              {/* 6 Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {[
                  { title: 'Total Products', value: stats.total, icon: Package, color: '#3498DB' },
                  { title: 'Approved Products', value: stats.approvedCount, icon: CheckCircle, color: '#2ECC71' },
                  { title: 'Pending Products', value: stats.pendingCount, icon: Clock, color: '#E67E22' },
                  { title: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: '#9B59B6' },
                  { title: 'Total Earnings', value: `₹${stats.totalEarnings}`, icon: DollarSign, color: '#2ECC71' },
                  { title: 'Available Stock', value: `${stats.totalStock} Units`, icon: Layers, color: '#1ABC9C' },
                ].map((c, idx) => {
                  const IconC = c.icon;
                  return (
                    <div key={idx} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{c.title}</span>
                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                          <IconC size={18} />
                        </div>
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>{c.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Sales / Earnings Overview Section with Chart */}
              <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BarChart3 size={20} style={{ color: '#2ECC71' }} /> Sales & Earnings Overview
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time revenue, orders, and produce distribution metrics</p>
                  </div>

                  {/* Chart Period Filters */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)' }}>
                    {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        style={{
                          padding: '0.35rem 1rem',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          color: chartPeriod === p ? '#ffffff' : 'var(--text-muted)',
                          background: chartPeriod === p ? '#2ECC71' : 'transparent',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period Key Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Sales</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2ECC71' }}>₹{chartData.daily[6].sales}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This Week</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>₹{chartData.weekly[3].sales}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This Month</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>₹{chartData.monthly[3].sales}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Earnings</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2ECC71' }}>₹{stats.totalEarnings || 45000}</div>
                  </div>
                </div>

                {/* Visual Responsive Bar Chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', height: '220px', paddingTop: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  {currentChartBars.map((bar, i) => {
                    const heightPct = Math.max(15, Math.round((bar.sales / maxBarValue) * 100));
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2ECC71', marginBottom: '0.35rem' }}>₹{bar.sales}</div>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '42px',
                            height: `${heightPct}%`,
                            background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)',
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 0.4s ease',
                          }}
                        />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{bar.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weather Widget */}
              <WeatherWidget district={user?.district || 'Coimbatore'} />
            </div>
          )}

          {/* TAB 2: MY PRODUCTS */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>📦 My Farm Produce ({filteredProducts.length})</h3>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="form-select"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    <option value="All">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button onClick={loadFarmerData} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Package size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No products found matching filters.</p>
                  <button onClick={() => setActiveTab('upload')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    <Plus size={16} /> Upload Product
                  </button>
                </div>
              ) : (
                <div className="grid-3">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', height: '160px', background: 'var(--bg-card-solid)' }}>
                          <img
                            src={resolveProductImage(p.name, p.category, p.image, p.id)}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getCategoryFallbackSvg(p.name, p.category);
                            }}
                          />
                          <span
                            className="badge"
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: p.status === 'Approved' ? '#2ECC71' : p.status === 'Pending Approval' ? '#E67E22' : '#FF4757',
                              color: '#ffffff',
                              fontWeight: 700,
                            }}
                          >
                            {p.status}
                          </span>
                          {p.organic && (
                            <span className="badge badge-success" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                              <Leaf size={10} /> 100% Organic
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{p.category}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock: {p.stock} {p.unit}</span>
                        </div>

                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.35rem' }}>{p.name}</h4>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.85rem' }}>
                          ₹{p.price} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {p.unit}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
                        <button onClick={() => setViewingProduct(p)} className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <Eye size={14} /> View
                        </button>
                        <button onClick={() => handleStartEdit(p)} className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id, p.name)} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADD PRODUCT */}
          {activeTab === 'upload' && (
            <div className="glass-card" style={{ maxWidth: '850px', margin: '0 auto', padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={24} style={{ color: 'var(--primary)' }} /> Add New Produce for Admin Approval
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Fill in details to upload your farm produce. Once submitted, it enters Pending Approval before appearing on the Customer Marketplace.
              </p>

              {!(uploadData.location || user?.farmLocation || user?.district || user?.address) && (
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 71, 87, 0.12)',
                    border: '1px solid rgba(255, 71, 87, 0.3)',
                    color: '#FF4757',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={20} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      Please complete your farm location before adding a product.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#FF4757', color: '#fff', border: 'none', fontWeight: 700 }}
                  >
                    Go to Profile Settings
                  </button>
                </div>
              )}

              {uploadMessage && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: uploadMessage.includes('successfully') ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                    color: uploadMessage.includes('successfully') ? '#2ECC71' : '#FF4757',
                    border: `1px solid ${uploadMessage.includes('successfully') ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                    fontWeight: 700,
                    marginBottom: '1.5rem',
                  }}
                >
                  {uploadMessage}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    placeholder="e.g. Fresh Organic Country Tomatoes"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Product Category *</label>
                  <select value={uploadData.category} onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })} className="form-select">
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Expected Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={uploadData.price}
                    onChange={(e) => setUploadData({ ...uploadData, price: e.target.value })}
                    placeholder="45"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Price Unit *</label>
                  <select value={uploadData.unit} onChange={(e) => setUploadData({ ...uploadData, unit: e.target.value })} className="form-select">
                    <option value="Per kg">Per kg</option>
                    <option value="Per gram">Per gram</option>
                    <option value="Per litre">Per litre</option>
                    <option value="Per piece">Per piece</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Available Quantity (Stock) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={uploadData.stock}
                    onChange={(e) => setUploadData({ ...uploadData, stock: e.target.value })}
                    placeholder="100"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Harvest Date</label>
                  <input type="date" value={uploadData.harvestDate} onChange={(e) => setUploadData({ ...uploadData, harvestDate: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Availability Date</label>
                  <input type="date" value={uploadData.availabilityDate} onChange={(e) => setUploadData({ ...uploadData, availabilityDate: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Expiry Date</label>
                  <input type="date" value={uploadData.expiryDate} onChange={(e) => setUploadData({ ...uploadData, expiryDate: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Farm Location</label>
                  <input type="text" value={uploadData.location} onChange={(e) => setUploadData({ ...uploadData, location: e.target.value })} placeholder="Pollachi, Coimbatore" className="form-input" />
                </div>

                {/* Product Image Upload */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Product Image (Local Upload or Image URL) *</label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={uploadData.image}
                      onChange={(e) => setUploadData({ ...uploadData, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => handleImageFileUpload(e, false)}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                    >
                      <ImageIcon size={16} />
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>

                  {uploadData.image && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card-solid)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <img src={uploadData.image} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Image Preview</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for product card listing</div>
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm">Replace</button>
                      <button type="button" onClick={() => setUploadData({ ...uploadData, image: '' })} className="btn btn-danger btn-sm">Remove</button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Description</label>
                  <textarea
                    rows={3}
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    placeholder="Freshly harvested from organic soil with zero chemical pesticides..."
                    className="form-textarea"
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="checkbox"
                    id="organicCheck"
                    checked={uploadData.organic}
                    onChange={(e) => setUploadData({ ...uploadData, organic: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="organicCheck" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                    <Leaf size={16} style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: '4px' }} />
                    100% Organically Farmed (Certified Organic)
                  </label>
                </div>

                {/* LOGISTICS SUMMARY CARD (Auto-Calculated) */}
                <div
                  style={{
                    gridColumn: 'span 2',
                    background: 'var(--bg-card-solid)',
                    border: '1px solid rgba(52, 152, 219, 0.4)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    marginTop: '0.5rem',
                  }}
                >
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#3498DB', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🚚 LOGISTICS & TRANSPORT CALCULATION SUMMARY
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Farmer Location</span>
                      <strong style={{ fontSize: '0.95rem' }}>📍 {uploadData.location || user?.farmLocation || user?.district || 'Pollachi'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Collection Hub</span>
                      <strong style={{ fontSize: '0.95rem', color: '#2ECC71' }}>🏭 Coimbatore Distribution Hub</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Distance to Hub</span>
                      <strong style={{ fontSize: '0.95rem', color: '#F39C12' }}>
                        {(() => {
                          const l = (uploadData.location || user?.farmLocation || user?.district || '').toLowerCase();
                          if (l.includes('palani')) return '110 km';
                          if (l.includes('erode')) return '95 km';
                          if (l.includes('coimbatore')) return '15 km';
                          return '45 km'; // Pollachi default
                        })()}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Farmer Price</span>
                      <strong style={{ fontSize: '0.95rem', color: '#2ECC71' }}>
                        {formatCurrency(Number(uploadData.price) || 0)} / {uploadData.unit}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Farmer → Hub Transport</span>
                      <strong style={{ fontSize: '0.95rem', color: '#27AE60' }}>
                        {(() => {
                          const l = (uploadData.location || user?.farmLocation || user?.district || '').toLowerCase();
                          let d = 45;
                          if (l.includes('palani')) d = 110;
                          else if (l.includes('erode')) d = 95;
                          else if (l.includes('coimbatore')) d = 15;
                          return formatCurrency(d * 0.05);
                        })()} / {uploadData.unit}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Company Commission (10%)</span>
                      <strong style={{ fontSize: '0.95rem', color: '#8E44AD' }}>
                        {formatCurrency((Number(uploadData.price) || 0) * 0.1)} / {uploadData.unit}
                      </strong>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ gridColumn: 'span 2', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}>
                  {uploading ? 'Submitting Product...' : 'Submit for Approval'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: PENDING APPROVAL */}
          {activeTab === 'pending' && (
            <div>
              <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(230, 126, 34, 0.1)', border: '1px solid rgba(230, 126, 34, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#E67E22', fontWeight: 700 }}>
                  <Clock size={20} />
                  <span>Products Waiting for Administrator Approval ({pendingProducts.length})</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  These items have been submitted and are under quality review by the AgriConnect Admin. Once approved, they will automatically appear in the Customer Marketplace.
                </p>
              </div>

              {pendingProducts.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Clock size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No products waiting for approval.</p>
                </div>
              ) : (
                <div className="grid-3">
                  {pendingProducts.map((p) => (
                    <div key={p.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', height: '160px' }}>
                        <img
                          src={resolveProductImage(p.name, p.category, p.image, p.id)}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getCategoryFallbackSvg(p.name, p.category);
                          }}
                        />
                        <span className="badge" style={{ position: 'absolute', top: '10px', right: '10px', background: '#E67E22', color: '#fff', fontWeight: 700 }}>
                          Pending Approval
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{p.category}</span>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem', marginBottom: '0.35rem' }}>{p.name}</h4>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem' }}>₹{p.price} / {p.unit}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>Submitted: {new Date(p.createdAt || Date.now()).toLocaleDateString()}</div>
                      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#E67E22', fontWeight: 600 }}>
                        ⏳ Status: Waiting for Admin Approval
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: APPROVED PRODUCTS */}
          {activeTab === 'approved' && (
            <div>
              <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#2ECC71', fontWeight: 700 }}>
                  <CheckCircle size={20} />
                  <span>Approved Live Products on Customer Marketplace ({approvedProducts.length})</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  These products are active and purchasable by customers in the AgriConnect marketplace.
                </p>
              </div>

              {approvedProducts.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <CheckCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No approved live products yet.</p>
                </div>
              ) : (
                <div className="grid-3">
                  {approvedProducts.map((p) => (
                    <div key={p.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', height: '160px' }}>
                        <img
                          src={resolveProductImage(p.name, p.category, p.image, p.id)}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getCategoryFallbackSvg(p.name, p.category);
                          }}
                        />
                        <span className="badge badge-success" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          Approved
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{p.category}</span>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem', marginBottom: '0.35rem' }}>{p.name}</h4>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem' }}>₹{p.price} / {p.unit}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>Available Quantity: <strong>{p.stock} {p.unit}</strong></div>
                      <button onClick={() => navigate(`/?search=${encodeURIComponent(p.name)}`)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                        View in Marketplace
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: REJECTED PRODUCTS */}
          {activeTab === 'rejected' && (
            <div>
              <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#FF4757', fontWeight: 700 }}>
                  <XCircle size={20} />
                  <span>Rejected Products Requiring Revision ({rejectedProducts.length})</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  Review admin rejection feedback below. Click 'Edit & Resubmit' to correct the details and submit back for quality approval.
                </p>
              </div>

              {rejectedProducts.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <CheckCircle size={40} style={{ color: '#2ECC71', marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Great news! No products have been rejected.</p>
                </div>
              ) : (
                <div className="grid-3">
                  {rejectedProducts.map((p) => (
                    <div key={p.id} className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(255, 71, 87, 0.3)' }}>
                      <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', height: '160px' }}>
                        <img
                          src={resolveProductImage(p.name, p.category, p.image, p.id)}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getCategoryFallbackSvg(p.name, p.category);
                          }}
                        />
                        <span className="badge" style={{ position: 'absolute', top: '10px', right: '10px', background: '#FF4757', color: '#fff', fontWeight: 700 }}>
                          Rejected
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{p.category}</span>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem' }}>{p.name}</h4>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '0.5rem' }}>₹{p.price} / {p.unit}</div>

                      <div style={{ padding: '0.75rem', background: 'rgba(255, 71, 87, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#FF4757', marginBottom: '1rem' }}>
                        <strong>Rejection Reason:</strong> {p.rejectionReason || 'Price or image quality requires adjustment.'}
                      </div>

                      <button onClick={() => handleStartEdit(p)} className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <RotateCcw size={14} /> Edit & Resubmit for Approval
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: ORDERS */}
          {activeTab === 'orders' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>🛒 Customer Orders ({filteredOrders.length})</h3>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  <option value="All">All Order Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={40} style={{ marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.1rem' }}>No orders found for your farm produce.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredOrders.map((ord) => (
                    <div key={ord.id} style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-card-solid)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                        <div>
                          <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem', marginRight: '0.75rem' }}>Order #{ord.id}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date: {new Date(ord.placedAt || Date.now()).toLocaleString()}</span>
                        </div>
                        <span className="badge badge-info" style={{ fontWeight: 800 }}>{ord.orderStatus}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Customer Details</div>
                          <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>👤 {ord.customerName}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📞 {ord.customerPhone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Distribution Hub</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3498DB', marginTop: '0.2rem' }}>
                            🏭 {ord.hubName || 'Coimbatore Distribution Hub'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: {ord.hubStatus || 'Pending Processing'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Delivery Location</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            📍 {ord.deliveryAddress?.street}, {ord.deliveryAddress?.district}, {ord.deliveryAddress?.pincode}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Order Value</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2ECC71', marginTop: '0.2rem' }}>₹{ord.grandTotal || ord.subtotal}</div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ordered Farm Items:</div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                        {ord.items?.map((it: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                            <span><strong>{it.productName}</strong> × {it.quantity} {it.unit}</span>
                            <span style={{ fontWeight: 700 }}>₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Status Update Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Update Status:</span>
                        {['Confirmed', 'Preparing', 'Ready for Pickup'].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateOrderStatus(ord.id, st)}
                            disabled={ord.orderStatus === st}
                            className={`btn btn-sm ${ord.orderStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.8rem' }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: EARNINGS */}
          {activeTab === 'earnings' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Earnings</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#2ECC71', marginTop: '0.25rem' }}>₹{stats.totalEarnings || 45000}</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Earnings</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#E67E22', marginTop: '0.25rem' }}>₹3,400</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Completed Earnings</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#2ECC71', marginTop: '0.25rem' }}>₹41,600</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Earnings</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#3498DB', marginTop: '0.25rem' }}>₹1,850</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>This Month's Earnings</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#9B59B6', marginTop: '0.25rem' }}>₹24,500</div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem' }}>Earnings Transaction Log</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem' }}>Order ID</th>
                        <th style={{ padding: '0.75rem' }}>Customer</th>
                        <th style={{ padding: '0.75rem' }}>Items</th>
                        <th style={{ padding: '0.75rem' }}>Amount</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerOrders.map((o) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>#{o.id}</td>
                          <td style={{ padding: '0.75rem' }}>{o.customerName}</td>
                          <td style={{ padding: '0.75rem' }}>{o.items?.map((i: any) => i.productName).join(', ') || 'Produce'}</td>
                          <td style={{ padding: '0.75rem', fontWeight: 800, color: '#2ECC71' }}>₹{o.grandTotal || o.subtotal}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className="badge badge-success">Completed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={22} style={{ color: '#2ECC71' }} /> Farmer Notifications ({notifications.length})
                </h3>
                {unreadNotifCount > 0 && (
                  <button onClick={handleMarkAllNotifsRead} className="btn btn-secondary btn-sm">
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Bell size={40} style={{ marginBottom: '1rem' }} />
                  <p>No notifications yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkNotifRead(n.id)}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: n.read ? 'var(--bg-card-solid)' : 'rgba(46, 204, 113, 0.1)',
                        border: `1px solid ${n.read ? 'var(--border-color)' : 'rgba(46, 204, 113, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ marginTop: '2px', color: '#2ECC71' }}>
                        <Bell size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{n.message}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{new Date(n.createdAt || Date.now()).toLocaleString()}</div>
                      </div>
                      {!n.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: PROFILE */}
          {activeTab === 'profile' && (
            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={22} style={{ color: 'var(--primary)' }} /> Edit Farmer Profile
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Update your farm details, location, phone number, and profile image. Saved in AgriConnect database.
              </p>

              {profileMessage && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: profileMessage.startsWith('✅') ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                    color: profileMessage.startsWith('✅') ? '#2ECC71' : '#FF4757',
                    border: `1px solid ${profileMessage.startsWith('✅') ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                    fontWeight: 700,
                    marginBottom: '1.5rem',
                  }}
                >
                  {profileMessage}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Full Name *</label>
                  <input type="text" required value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Phone Number *</label>
                  <input type="text" required value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Email Address</label>
                  <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Farm Name</label>
                  <input type="text" value={profileData.farmName} onChange={(e) => setProfileData({ ...profileData, farmName: e.target.value })} placeholder="Pollachi Greenfields Farm" className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Farm Location / Landmark</label>
                  <input type="text" value={profileData.farmLocation} onChange={(e) => setProfileData({ ...profileData, farmLocation: e.target.value })} placeholder="Anaimalai Road, Pollachi" className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Village / Town</label>
                  <input type="text" value={profileData.village} onChange={(e) => setProfileData({ ...profileData, village: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">District</label>
                  <input type="text" value={profileData.district} onChange={(e) => setProfileData({ ...profileData, district: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">State</label>
                  <input type="text" value={profileData.state} onChange={(e) => setProfileData({ ...profileData, state: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label className="form-label">Organic Status</label>
                  <select value={profileData.organicStatus} onChange={(e) => setProfileData({ ...profileData, organicStatus: e.target.value })} className="form-select">
                    <option value="Verified Organic">Verified Organic</option>
                    <option value="In Transition">In Transition</option>
                    <option value="Traditional">Traditional Natural</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Products Grown</label>
                  <input type="text" value={profileData.productsGrown} onChange={(e) => setProfileData({ ...profileData, productsGrown: e.target.value })} className="form-input" />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Profile Image URL</label>
                  <input type="url" value={profileData.profileImage} onChange={(e) => setProfileData({ ...profileData, profileImage: e.target.value })} className="form-input" />
                </div>

                <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ gridColumn: 'span 2', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}>
                  {savingProfile ? 'Saving Profile...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 11: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="glass-card" style={{ maxWidth: '750px', margin: '0 auto', padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SettingsIcon size={22} style={{ color: 'var(--primary)' }} /> Farmer Settings & Preferences
              </h3>

              {settingsMessage && (
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(46, 204, 113, 0.15)', color: '#2ECC71', fontWeight: 700, marginBottom: '1.5rem' }}>
                  {settingsMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Notification Settings */}
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '1rem', color: '#2ECC71' }}>Notification Preferences</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <span>Receive Order SMS Notifications</span>
                      <input type="checkbox" checked={settingsData.smsAlerts} onChange={(e) => setSettingsData({ ...settingsData, smsAlerts: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#2ECC71' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <span>Receive Admin Approval Emails</span>
                      <input type="checkbox" checked={settingsData.emailAlerts} onChange={(e) => setSettingsData({ ...settingsData, emailAlerts: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#2ECC71' }} />
                    </label>
                  </div>
                </div>

                {/* Password Change */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '1rem' }}>Password Change</h4>
                  <form onSubmit={(e) => { e.preventDefault(); setSettingsMessage('✅ Settings & Security Preferences Saved!'); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <input type="password" value={settingsData.currentPassword} onChange={(e) => setSettingsData({ ...settingsData, currentPassword: e.target.value })} className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input type="password" value={settingsData.newPassword} onChange={(e) => setSettingsData({ ...settingsData, newPassword: e.target.value })} className="form-input" />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                      Save Preferences
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* VIEW PRODUCT DETAIL MODAL */}
      {viewingProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#111218' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Product Details</h3>
              <button onClick={() => setViewingProduct(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <img
              src={resolveProductImage(viewingProduct.name, viewingProduct.category, viewingProduct.image, viewingProduct.id)}
              alt={viewingProduct.name}
              style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getCategoryFallbackSvg(viewingProduct.name, viewingProduct.category);
              }}
            />
            <div style={{ fontSize: '0.8rem', color: '#2ECC71', fontWeight: 800, textTransform: 'uppercase' }}>{viewingProduct.category}</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>{viewingProduct.name}</h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2ECC71', marginBottom: '1rem' }}>₹{viewingProduct.price} / {viewingProduct.unit}</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{viewingProduct.description || 'No description provided.'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div>Stock: <strong>{viewingProduct.stock} {viewingProduct.unit}</strong></div>
              <div>Organic: <strong>{viewingProduct.organic ? 'Yes (100%)' : 'No'}</strong></div>
              <div>Harvest Date: <strong>{viewingProduct.harvestDate || 'N/A'}</strong></div>
              <div>Expiry Date: <strong>{viewingProduct.expiryDate || 'N/A'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#111218' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Edit Produce: {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Produce Name</label>
                <input type="text" required value={editFormData.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Category</label>
                <select value={editFormData.category || 'Vegetables'} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} className="form-select">
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Price (₹)</label>
                <input type="number" required min="1" value={editFormData.price || ''} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Stock Quantity</label>
                <input type="number" required min="1" value={editFormData.stock || ''} onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })} className="form-input" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Unit</label>
                <select value={editFormData.unit || 'Kg'} onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })} className="form-select">
                  <option value="Kg">Kg</option>
                  <option value="Gram">Gram</option>
                  <option value="Liter">Liter</option>
                  <option value="Piece">Piece</option>
                  <option value="Pack">Pack</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Image URL / File</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" value={editFormData.image || ''} onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })} className="form-input" style={{ flex: 1 }} />
                  <input type="file" ref={editFileInputRef} accept="image/*" onChange={(e) => handleImageFileUpload(e, true)} style={{ display: 'none' }} />
                  <button type="button" onClick={() => editFileInputRef.current?.click()} className="btn btn-secondary">
                    <ImageIcon size={16} /> Upload
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description</label>
                <textarea rows={3} value={editFormData.description || ''} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} className="form-textarea" />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="btn btn-primary">
                  {updating ? 'Updating...' : 'Save & Resubmit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
