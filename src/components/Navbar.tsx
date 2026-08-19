import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sprout,
  ShoppingCart,
  Heart,
  Bell,
  Sun,
  Moon,
  Languages,
  User as UserIcon,
  LogOut,
  Search,
  Mic,
  Shield,
  Tractor,
  Truck,
  UserCheck,
  Package,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC<{ onOpenVoiceSearch?: () => void; onOpenCartDrawer?: () => void }> = ({ onOpenVoiceSearch, onOpenCartDrawer }) => {
  const { user, logout } = useAuth();
  const { cartCount, wishlist } = useCart();
  const { language, toggleLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('farmdirect_token');
    if (!token || !user) return;
    try {
      const res = await fetch('/api/notifications?limit=15', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* non-fatal */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const token = localStorage.getItem('farmdirect_token');
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* non-fatal */ }
  };

  const markOneRead = async (id: string) => {
    const token = localStorage.getItem('farmdirect_token');
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* non-fatal */ }
  };

  const priorityColor = (p?: string) => {
    if (p === 'SUCCESS') return '#2ECC71';
    if (p === 'WARNING') return '#F39C12';
    if (p === 'URGENT') return '#E74C3C';
    return '#3498DB';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky-navbar" style={{ position: 'sticky', top: 0, zIndex: 900, backdropFilter: 'blur(16px)', backgroundColor: 'var(--glass-bg)', borderBottom: '1px solid var(--border-color)' }}>
      {/* Top Banner Bar */}
      <div style={{ backgroundColor: 'var(--bg-header)', color: '#ffffff', padding: '0.35rem 1.5rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sprout size={14} style={{ color: '#2ECC71' }} />
          <span>{t('topBanner')}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Portals:</span>
          <button
            onClick={() => {
              if (user?.role === 'customer') {
                navigate('/');
              } else {
                const customerToken = localStorage.getItem('farmdirect_token_customer');
                if (customerToken) {
                  localStorage.setItem('farmdirect_token', customerToken);
                  window.location.href = '/';
                } else {
                  navigate('/login?role=customer');
                }
              }
            }}
            style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ShoppingCart size={12} /> {t('customerPortal')}
          </button>
          <button
            onClick={() => {
              if (user?.role === 'shopkeeper' || user?.role === 'admin') {
                navigate('/shopkeeper/dashboard');
              } else {
                const shopkeeperToken = localStorage.getItem('farmdirect_token_shopkeeper');
                if (shopkeeperToken) {
                  localStorage.setItem('farmdirect_token', shopkeeperToken);
                  window.location.href = '/shopkeeper/dashboard';
                } else {
                  navigate('/login?role=shopkeeper');
                }
              }
            }}
            style={{ color: '#8B5CF6', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Store size={12} /> Shopkeeper B2B
          </button>
          <button
            onClick={() => {
              if (user?.role === 'farmer' || user?.role === 'admin') {
                navigate('/farmer/dashboard');
              } else {
                const farmerToken = localStorage.getItem('farmdirect_token_farmer');
                if (farmerToken) {
                  localStorage.setItem('farmdirect_token', farmerToken);
                  window.location.href = '/farmer/dashboard';
                } else {
                  navigate('/login?role=farmer');
                }
              }
            }}
            style={{ color: '#2ECC71', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Tractor size={12} /> {t('farmerPortal')}
          </button>
          <button
            onClick={() => {
              if (user?.role === 'delivery' || user?.role === 'admin') {
                navigate('/delivery/dashboard');
              } else {
                const deliveryToken = localStorage.getItem('farmdirect_token_delivery');
                if (deliveryToken) {
                  localStorage.setItem('farmdirect_token', deliveryToken);
                  window.location.href = '/delivery/dashboard';
                } else {
                  navigate('/login?role=delivery');
                }
              }
            }}
            style={{ color: '#3498DB', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Truck size={12} /> {t('deliveryPortal')}
          </button>
          <button
            onClick={() => {
              if (user?.role === 'admin') {
                navigate('/admin/dashboard');
              } else {
                const adminToken = localStorage.getItem('farmdirect_token_admin');
                if (adminToken) {
                  localStorage.setItem('farmdirect_token', adminToken);
                  window.location.href = '/admin/dashboard';
                } else {
                  navigate('/login?role=admin');
                }
              }
            }}
            style={{ color: '#FF4757', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Shield size={12} /> {t('adminPortal')}
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
        {/* Brand Logo & Back Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: 'var(--radius-pill)', gap: '0.35rem', fontWeight: 600, padding: '0.45rem 0.85rem' }}
              title="Go back to previous page"
            >
              <ArrowLeft size={16} /> {t('back')}
            </button>
          )}

          <button
            onClick={() => {
              const customerToken = localStorage.getItem('farmdirect_token_customer');
              if (customerToken && user?.role !== 'customer') {
                const currentToken = localStorage.getItem('farmdirect_token');
                if (currentToken && user?.role) {
                  localStorage.setItem(`farmdirect_token_${user.role}`, currentToken);
                }
                localStorage.setItem('farmdirect_token', customerToken);
                window.location.href = '/';
              } else {
                navigate('/');
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            <div style={{ background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)', color: '#000000', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(46, 204, 113, 0.3)' }}>
              <Sprout size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Farm<span style={{ color: 'var(--primary)' }}>Direct</span>
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {t('tagline')}
              </div>
            </div>
          </button>
        </div>

        {/* Search Bar with Voice Feature */}
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '480px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem', paddingRight: '2.5rem', borderRadius: 'var(--radius-pill)' }}
          />
          {onOpenVoiceSearch && (
            <button
              type="button"
              onClick={onOpenVoiceSearch}
              title="Voice Search"
              style={{ position: 'absolute', right: '10px', color: 'var(--primary)', padding: '4px', borderRadius: '50%', background: 'var(--primary-light)' }}
            >
              <Mic size={16} />
            </button>
          )}
        </form>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-pill)', gap: '0.3rem' }}
            title="Switch Language"
          >
            <Languages size={16} /> {t('languageToggle')}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-pill)', padding: '0.5rem' }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Direct My Orders / Live Tracking Link */}
          <button
            onClick={() => {
              const customerToken = localStorage.getItem('farmdirect_token_customer');
              if (customerToken && user?.role !== 'customer') {
                const currentToken = localStorage.getItem('farmdirect_token');
                if (currentToken && user?.role) {
                  localStorage.setItem(`farmdirect_token_${user.role}`, currentToken);
                }
                localStorage.setItem('farmdirect_token', customerToken);
                window.location.href = '/orders';
              } else {
                navigate('/orders');
              }
            }}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-pill)', gap: '0.35rem', color: 'var(--primary)', fontWeight: 700, border: '1px solid var(--primary-light)' }}
            title="My Orders & Live Tracking"
          >
            <Package size={16} /> {t('myOrders')}
          </button>

          {/* Notification Bell */}
          {user && (
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                id="notification-bell-btn"
                onClick={() => { setShowNotifications(p => !p); if (!showNotifications) fetchNotifications(); }}
                style={{ position: 'relative', padding: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                title="Notifications"
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '0', right: '0', background: '#E74C3C', color: '#ffffff', borderRadius: '50%', minWidth: '18px', height: '18px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div id="notification-dropdown" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '340px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', zIndex: 1100, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🔔 Notifications {unreadCount > 0 && <span style={{ background: '#E74C3C', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', marginLeft: '6px' }}>{unreadCount}</span>}</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <Bell size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <div>No notifications yet</div>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.read && markOneRead(n.id)}
                          style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: n.read ? 'default' : 'pointer', background: n.read ? 'transparent' : 'var(--primary-light)', display: 'flex', gap: '0.65rem', alignItems: 'flex-start', transition: 'background 0.15s' }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: priorityColor(n.priority), marginTop: '5px', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{n.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>{new Date(n.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</div>
                          </div>
                          {!n.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '5px' }} />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Cart */}
          <button
            type="button"
            onClick={onOpenCartDrawer || (() => navigate('/cart'))}
            style={{ position: 'relative', padding: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            title="View Shopping Cart Drawer"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--primary)', color: '#ffffff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cartCount}
              </span>
            )}
          </button>

          {/* Customer Wishlist */}
          <Link to="/wishlist" style={{ position: 'relative', padding: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <Heart size={22} />
            {wishlist.length > 0 && (
              <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--accent)', color: '#ffffff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* User Account / Login */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-pill)' }}
              >
                <img
                  src={user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={user.name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.name.split(' ')[0]}</span>
                <span className={`badge badge-${user.role === 'admin' ? 'danger' : user.role === 'farmer' ? 'success' : user.role === 'delivery' ? 'info' : 'warning'}`}>
                  {user.role}
                </span>
              </button>

              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, marginTop: '0.5rem', width: '220px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: '0.5rem', zIndex: 1000 }}>
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>

                  {user.role === 'farmer' && (
                    <Link to="/farmer/dashboard" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      <Tractor size={16} /> {t('farmerDashboard')}
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin/dashboard" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      <Shield size={16} /> {t('adminDashboard')}
                    </Link>
                  )}
                  {user.role === 'delivery' && (
                    <Link to="/delivery/dashboard" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      <Truck size={16} /> {t('deliveryDashboard')}
                    </Link>
                  )}
                  {user.role === 'shopkeeper' && (
                    <Link to="/shopkeeper/dashboard" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: '#8B5CF6', fontWeight: 700 }}>
                      <Store size={16} /> Shopkeeper Dashboard
                    </Link>
                  )}
                  {user.role === 'customer' && (
                    <>
                      <Link to="/orders" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        <UserCheck size={16} /> {t('myOrders')}
                      </Link>
                      <Link to="/profile" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        <UserIcon size={16} /> {t('customerProfile')}
                      </Link>
                    </>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      navigate('/');
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--danger)', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}
                  >
                    <LogOut size={16} /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-pill)' }}>
                {t('login')}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-pill)' }}>
                {t('register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
