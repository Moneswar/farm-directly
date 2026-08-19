import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Building,
  MapPin,
  TrendingUp,
  DollarSign,
  Plus,
  Minus,
  Search,
  Filter,
  LogOut,
  User,
  Settings,
  Truck,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileText,
  Layers,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { apiFetch } from '../services/api';
import { OrderTracker } from '../components/OrderTracker';
import { InvoiceModal } from '../components/InvoiceModal';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';

export const ShopkeeperDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToCart, cart, clearCart } = useCart();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'bulk_order' | 'orders' | 'summary' | 'profile' | 'settings'
  >('dashboard');

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);

  // Bulk order calculator state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [bulkQty, setBulkQty] = useState<number>(10);
  const [wholesaleCalculation, setWholesaleCalculation] = useState<any | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'self_pickup' | 'home_delivery'>('self_pickup');
  const [placingOrder, setPlacingOrder] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, orderRes] = await Promise.all([
        apiFetch('/products'),
        apiFetch('/orders'),
      ]);

      if (prodRes.success) {
        setProducts(prodRes.products || []);
        if (prodRes.products?.length > 0 && !selectedProduct) {
          setSelectedProduct(prodRes.products[0]);
        }
      }
      if (orderRes.success) {
        setOrders(orderRes.orders || []);
      }
    } catch (err) {
      console.error('Error loading shopkeeper data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update wholesale calculation whenever selectedProduct or bulkQty changes
  useEffect(() => {
    if (!selectedProduct) return;
    const qty = Math.max(10, Number(bulkQty) || 10);

    apiFetch('/products/calculate-wholesale', {
      method: 'POST',
      body: JSON.stringify({ productId: selectedProduct.id, quantity: qty }),
    })
      .then((res) => {
        if (res.success) {
          setWholesaleCalculation(res.calculation);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedProduct, bulkQty]);

  const activeOrders = orders.filter((o) => !['Completed', 'Delivered', 'Cancelled'].includes(o.orderStatus));
  const completedOrders = orders.filter((o) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered');
  const totalPurchaseAmount = completedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  const categories = ['All', 'Vegetables', 'Fruits', 'Leafy Greens', 'Grains', 'Pulse', 'Seeds', 'Organic'];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      categoryFilter === 'All' ||
      (categoryFilter === 'Organic' ? p.organic === true : p.category === categoryFilter);
    return matchesSearch && matchesCat;
  });

  const handlePlaceInstantBulkOrder = async () => {
    if (!selectedProduct || !wholesaleCalculation) return;
    const qty = Math.max(10, bulkQty);

    if (selectedProduct.stock < qty) {
      alert(`Insufficient stock! Available: ${selectedProduct.stock} ${selectedProduct.unit}`);
      return;
    }

    setPlacingOrder(true);
    try {
      const orderPayload = {
        items: [
          {
            productId: selectedProduct.id,
            quantity: qty,
          },
        ],
        deliveryAddress: {
          street: user?.address || 'Shop Location',
          district: user?.district || 'Coimbatore',
          state: user?.state || 'Tamil Nadu',
          pincode: user?.pincode || '641001',
        },
        deliveryMethod,
        orderType: 'wholesale',
        paymentMethod: 'UPI',
      };

      const res = await apiFetch('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      if (res.success) {
        alert(`🎉 Wholesale Order #${res.order.id} placed successfully!`);
        loadData();
        setActiveTab('orders');
      } else {
        alert(`Order failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(err.message || 'Order failed');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 2rem',
          borderRadius: '20px',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: '#8B5CF6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              boxShadow: '0 8px 20px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Store size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                {user?.businessName || user?.name || 'Shopkeeper Mart'}
              </h1>
              <span className="badge badge-success" style={{ background: '#8B5CF6', color: '#fff', fontWeight: 800 }}>
                🏬 Wholesale Buyer B2B
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Direct Farm Produce • Quantity Slab Discounts (8%, 6%, 5%) • Hub Collection or Store Delivery
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('bulk_order')}
            className="btn btn-primary"
            style={{ borderRadius: 'var(--radius-pill)', gap: '0.5rem', background: '#8B5CF6' }}
          >
            <Plus size={18} /> Quick Bulk Order
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem' }}>
        {/* Navigation Sidebar */}
        <div className="glass-card" style={{ padding: '1.25rem', height: 'fit-content', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Shopkeeper Navigation
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: Store },
              { id: 'products', label: 'Wholesale Marketplace', icon: ShoppingBag, count: products.length },
              { id: 'bulk_order', label: 'Quick Bulk Order', icon: Package },
              { id: 'orders', label: 'My Wholesale Orders', icon: Clock, count: orders.length },
              { id: 'summary', label: 'Purchase Summary', icon: TrendingUp },
              { id: 'profile', label: 'Business Profile', icon: User },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive ? '#8B5CF6' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Icon size={18} />
                    <span style={{ fontSize: '0.9rem' }}>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-color)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                        padding: '2px 7px',
                        borderRadius: '10px',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '1rem',
              }}
            >
              <LogOut size={18} /> Logout Portal
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div>
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Analytics Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8B5CF6' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Active Bulk Orders
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8B5CF6' }}>{activeOrders.length}</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{completedOrders.length} completed historical</span>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Total Wholesale Purchase
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#22c55e' }}>₹{totalPurchaseAmount.toLocaleString('en-IN')}</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>From {completedOrders.length} completed orders</span>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Available Produce Items
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3b82f6' }}>{products.length}</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Wholesale ready from farmers</span>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Wholesale Savings Tier
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>Up to 10% OFF</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quantity Slabs: 8%, 6%, 5%</span>
                </div>
              </div>

              {/* Quick Bulk Order Hero Banner */}
              <div
                className="glass-card"
                style={{
                  padding: '1.75rem',
                  borderRadius: '16px',
                  marginBottom: '2rem',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    📦 Direct Farm-to-Shop Bulk Ordering
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                    Order 10+ kg directly from Pollachi, Palani, Erode, & Ooty farmers. Pick up at Regional Hub or get store delivery.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-pill)', padding: '0.6rem 1.4rem' }}
                >
                  Browse Wholesale Marketplace <ArrowRight size={16} />
                </button>
              </div>

              {/* Active Orders Quick View */}
              {activeOrders.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={20} color="#8B5CF6" /> Active Wholesale Orders ({activeOrders.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activeOrders.map((ord) => (
                      <div key={ord.id} className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                        <OrderTracker
                          status={ord.orderStatus}
                          deliveryOtp={ord.deliveryOtp}
                          deliveryBoyName={ord.deliveryBoyName}
                          deliveryBoyPhone={ord.deliveryBoyPhone}
                          orderId={ord.id}
                          hubName={ord.hubName || ord.deliveryHubName}
                          deliveryMethod={ord.deliveryMethod}
                          deliveryDistanceKm={ord.deliveryDistanceKm}
                          deliveryCharge={ord.deliveryCharge}
                          deliveredAt={ord.deliveredAt}
                          deliveryOtpVerified={ord.deliveryOtpVerified}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WHOLESALE MARKETPLACE */}
          {activeTab === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Wholesale Fresh Produce Catalog</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Wholesale prices automatically apply for orders of 10+ units
                  </p>
                </div>

                {/* Search Bar */}
                <div style={{ display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '400px' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search produce, farmer, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '36px', height: '40px', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quantity Slab Informational Banner */}
              <div
                className="glass-card"
                style={{
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <strong>🏷️ Quantity Wholesale Slabs:</strong>
                  <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>
                    <strong>10–49 units:</strong> Base + 8% | <strong>50–99 units:</strong> Base + 6% | <strong>100+ units:</strong> Base + 5%
                  </span>
                </div>
                <span style={{ color: '#8B5CF6', fontWeight: 800 }}>Min: 10 units</span>
              </div>

              {/* Product Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.25rem' }}>
                {filteredProducts.map((p) => {
                  const wholesalePriceVal = p.wholesalePrice || Math.round((p.price * 0.93) * 100) / 100;
                  return (
                    <div
                      key={p.id}
                      className="glass-card"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ position: 'relative', height: '150px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.85rem' }}>
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
                              top: '8px',
                              right: '8px',
                              background: '#8B5CF6',
                              color: '#fff',
                              fontWeight: 800,
                            }}
                          >
                            Wholesale ₹{wholesalePriceVal}/{p.unit}
                          </span>
                          {p.organic && (
                            <span
                              className="badge badge-success"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                fontSize: '0.7rem',
                              }}
                            >
                              🌱 100% Organic
                            </span>
                          )}
                        </div>

                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                          {p.name}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Farmer: <strong>{p.farmerName}</strong> • {p.location}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'var(--bg-card-solid)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                          <span>Stock: <strong>{p.stock} {p.unit}</strong></span>
                          <span>Retail: <del>₹{p.price}</del></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setActiveTab('bulk_order');
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: '#8B5CF6', borderRadius: 'var(--radius-pill)' }}
                        >
                          Configure Bulk Order
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QUICK BULK ORDER CALCULATOR */}
          {activeTab === 'bulk_order' && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={24} color="#8B5CF6" /> Quick Wholesale Bulk Order
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
                Select produce item & quantity slab to preview base cost, wholesale margin, and place order directly to hub.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Form controls */}
                <div>
                  <div className="form-group">
                    <label className="form-label">Select Produce Item</label>
                    <select
                      value={selectedProduct?.id || ''}
                      onChange={(e) => {
                        const p = products.find((prod) => prod.id === e.target.value);
                        setSelectedProduct(p);
                      }}
                      className="form-select"
                      style={{ fontSize: '0.95rem', height: '44px' }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.farmerName} • Stock: {p.stock} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bulk Order Quantity ({selectedProduct?.unit || 'units'}) * Min: 10</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setBulkQty(Math.max(10, bulkQty - 10))}
                        className="btn btn-secondary"
                        style={{ height: '44px', width: '44px' }}
                      >
                        -10
                      </button>
                      <input
                        type="number"
                        min={10}
                        max={selectedProduct?.stock || 1000}
                        value={bulkQty}
                        onChange={(e) => setBulkQty(Math.max(1, Number(e.target.value)))}
                        className="form-input"
                        style={{ height: '44px', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                      />
                      <button
                        type="button"
                        onClick={() => setBulkQty(bulkQty + 10)}
                        className="btn btn-secondary"
                        style={{ height: '44px', width: '44px' }}
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  {/* Preset Slab Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[
                      { label: '20 kg (8% margin)', qty: 20 },
                      { label: '50 kg (6% margin)', qty: 50 },
                      { label: '100 kg (5% margin)', qty: 100 },
                    ].map((s) => (
                      <button
                        key={s.qty}
                        type="button"
                        onClick={() => setBulkQty(s.qty)}
                        className={`btn btn-sm ${bulkQty === s.qty ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.78rem', borderRadius: 'var(--radius-pill)' }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Option</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('self_pickup')}
                        className="glass-card"
                        style={{
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: `2px solid ${deliveryMethod === 'self_pickup' ? '#22c55e' : 'var(--border-color)'}`,
                          background: deliveryMethod === 'self_pickup' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#22c55e', fontSize: '0.9rem' }}>📦 Hub Self Pickup</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹0 Delivery Fee</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('home_delivery')}
                        className="glass-card"
                        style={{
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: `2px solid ${deliveryMethod === 'home_delivery' ? '#3b82f6' : 'var(--border-color)'}`,
                          background: deliveryMethod === 'home_delivery' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.9rem' }}>🚚 Store Delivery</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hub → Store Delivery</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calculation Breakdown Preview */}
                {wholesaleCalculation && (
                  <div
                    className="glass-card"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '16px',
                      background: 'var(--bg-card-solid)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        📊 Price & Cost Breakdown
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                          <strong>{selectedProduct?.name}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Base Cost (Farmer + Logistics):</span>
                          <span>₹{wholesaleCalculation.baseCost}/{selectedProduct?.unit}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Wholesale Margin Rate:</span>
                          <span style={{ color: '#8B5CF6', fontWeight: 800 }}>+{wholesaleCalculation.slabMarginPercentage}% Margin</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Unit Wholesale Price:</span>
                          <strong style={{ fontSize: '1.1rem', color: '#8B5CF6' }}>₹{wholesaleCalculation.wholesalePrice}/{selectedProduct?.unit}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>Retail Comparison Price:</span>
                          <span><del>₹{selectedProduct?.price}/{selectedProduct?.unit}</del></span>
                        </div>

                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem' }}>
                          <span>Order Subtotal ({bulkQty} {selectedProduct?.unit}):</span>
                          <span style={{ color: '#22c55e' }}>₹{wholesaleCalculation.subtotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceInstantBulkOrder}
                      disabled={placingOrder || bulkQty < 10}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.9rem',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        borderRadius: 'var(--radius-pill)',
                        background: '#8B5CF6',
                        marginTop: '1.5rem',
                      }}
                    >
                      {placingOrder ? 'Processing Wholesale Order...' : `Confirm Bulk Order (₹${wholesaleCalculation.subtotal.toLocaleString('en-IN')})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MY WHOLESALE ORDERS */}
          {activeTab === 'orders' && (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>My Wholesale Orders ({orders.length})</h3>

              {orders.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <h4>No wholesale orders placed yet</h4>
                  <p style={{ color: 'var(--text-muted)' }}>Place a bulk order from the Wholesale Marketplace to track live hub processing.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {orders.map((ord) => (
                    <div key={ord.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#8B5CF6' }}>Order #{ord.id}</span>
                          <span className="badge" style={{ background: '#8B5CF6', color: '#fff', marginLeft: '0.5rem' }}>
                            {ord.orderType || 'wholesale'}
                          </span>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Placed: {new Date(ord.placedAt).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)' }}>₹{ord.grandTotal}</div>
                          <button onClick={() => setSelectedInvoiceOrder(ord)} className="btn btn-secondary btn-sm" style={{ gap: '4px', marginTop: '4px' }}>
                            <FileText size={14} /> Tax Invoice
                          </button>
                        </div>
                      </div>

                      {/* Tracker */}
                      <OrderTracker
                        status={ord.orderStatus}
                        deliveryOtp={ord.deliveryOtp}
                        deliveryBoyName={ord.deliveryBoyName}
                        deliveryBoyPhone={ord.deliveryBoyPhone}
                        orderId={ord.id}
                        hubName={ord.hubName || ord.deliveryHubName}
                        deliveryMethod={ord.deliveryMethod}
                        deliveryDistanceKm={ord.deliveryDistanceKm}
                        deliveryCharge={ord.deliveryCharge}
                        deliveredAt={ord.deliveredAt}
                        deliveryOtpVerified={ord.deliveryOtpVerified}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PURCHASE SUMMARY */}
          {activeTab === 'summary' && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Shopkeeper Purchase & Earnings Summary</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL COMPLETED ORDERS</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#8B5CF6' }}>{completedOrders.length}</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL EXPENDITURE</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>₹{totalPurchaseAmount.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>Order Log</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Order ID</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Delivery Method</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 800, color: '#8B5CF6' }}>#{o.id}</td>
                        <td style={{ padding: '0.75rem' }}>{new Date(o.placedAt).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '0.75rem' }}>{o.deliveryMethod === 'self_pickup' ? '📦 Self Pickup' : '🚚 Home Delivery'}</td>
                        <td style={{ padding: '0.75rem' }}><span className="badge badge-success">{o.orderStatus}</span></td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800 }}>₹{o.grandTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: BUSINESS PROFILE */}
          {activeTab === 'profile' && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Business & Shop Profile</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.9rem' }}>
                <div><strong>Business Name:</strong> {user?.businessName || user?.name}</div>
                <div><strong>Owner Name:</strong> {user?.name}</div>
                <div><strong>Email:</strong> {user?.email}</div>
                <div><strong>Phone:</strong> {user?.phone || 'N/A'}</div>
                <div><strong>Business Type:</strong> {user?.businessType || 'Retail Grocery'}</div>
                <div><strong>GST / Reg No:</strong> {user?.businessRegNo || 'N/A'}</div>
                <div><strong>City:</strong> {user?.city || user?.district || 'Coimbatore'}</div>
                <div><strong>Address:</strong> {user?.address}</div>
                <div><strong>Wallet Balance:</strong> ₹{user?.walletBalance || 0}</div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Shopkeeper Settings</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure preferred distribution hub and store delivery preferences.</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      )}
    </div>
  );
};
