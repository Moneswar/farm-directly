import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sprout, Tractor, User, Truck, Shield, Store, Lock, Mail, ArrowRight, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { t } = useI18n();

  const roleParam = searchParams.get('role') as any;
  const initialRole = roleParam || 'customer';
  const [role, setRole] = useState<'farmer' | 'customer' | 'delivery' | 'admin' | 'shopkeeper'>(initialRole);

  React.useEffect(() => {
    if (roleParam && ['farmer', 'customer', 'delivery', 'admin', 'shopkeeper'].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [roleParam]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login({ email, password, role });
      if (loggedUser.role === 'farmer') navigate('/farmer/dashboard');
      else if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else if (loggedUser.role === 'delivery') navigate('/delivery/dashboard');
      else if (loggedUser.role === 'shopkeeper') navigate('/shopkeeper/dashboard');
      else navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Auto-Fill helper
  const handleDemoFill = (selectedRole: 'farmer' | 'customer' | 'delivery' | 'admin' | 'shopkeeper') => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setEmail('admin@farmdirect.com');
      setPassword('adminpassword123');
    } else if (selectedRole === 'farmer') {
      setEmail('farmer@farmdirect.com');
      setPassword('farmerpassword123');
    } else if (selectedRole === 'customer') {
      setEmail('customer@farmdirect.com');
      setPassword('customerpassword123');
    } else if (selectedRole === 'shopkeeper') {
      setEmail('shopkeeper@farmdirect.com');
      setPassword('customerpassword123');
    } else if (selectedRole === 'delivery') {
      setEmail('delivery@farmdirect.com');
      setPassword('deliverypassword123');
    }
  };

  const getRoleTitle = () => {
    if (role === 'customer') return 'Customer Marketplace Portal';
    if (role === 'shopkeeper') return 'Shopkeeper Wholesale B2B Portal';
    if (role === 'farmer') return 'Farmer Produce & Sales Portal';
    if (role === 'delivery') return 'Delivery Partner Logistics Portal';
    if (role === 'admin') return 'System Administrator Control Portal';
    return 'FarmDirect Portal';
  };

  const getRoleColor = () => {
    if (role === 'customer') return '#10B981';
    if (role === 'farmer') return '#059669';
    if (role === 'delivery') return '#2563EB';
    if (role === 'admin') return '#DC2626';
    return '#10B981';
  };

  return (
    <div style={{ maxWidth: '840px', margin: '3rem auto', padding: '0 1rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      {/* Header Branding */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#ffffff',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          }}
        >
          <Sprout size={36} />
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Farm<span style={{ color: 'var(--primary)' }}>Direct</span> Portal Login
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Please select your portal field below to log in or register your account
        </p>
      </div>

      {/* Role Selection Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            id: 'customer',
            title: 'Customer',
            desc: 'Buy 100% organic farm produce',
            icon: User,
            color: '#10B981',
          },
          {
            id: 'shopkeeper',
            title: 'Shopkeeper B2B',
            desc: 'Bulk produce at wholesale rates',
            icon: Store,
            color: '#8B5CF6',
          },
          {
            id: 'farmer',
            title: 'Farmer',
            desc: 'List produce & sell directly',
            icon: Tractor,
            color: '#059669',
          },
          {
            id: 'delivery',
            title: 'Delivery Boy',
            desc: 'Deliver trips & earn daily payouts',
            icon: Truck,
            color: '#2563EB',
          },
          {
            id: 'admin',
            title: 'Administration',
            desc: 'Manage quality check & system',
            icon: Shield,
            color: '#DC2626',
          },
        ].map((item) => {
          const IconComponent = item.icon;
          const isSelected = role === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id as any)}
              className="glass-card"
              style={{
                padding: '1.25rem 1rem',
                textAlign: 'center',
                borderRadius: '16px',
                border: `2px solid ${isSelected ? item.color : 'var(--border-color)'}`,
                background: isSelected ? 'var(--primary-light)' : 'var(--bg-card-solid)',
                boxShadow: isSelected ? `0 8px 24px rgba(0,0,0,0.1)` : 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  background: isSelected ? item.color : 'var(--bg-primary)',
                  color: isSelected ? '#ffffff' : item.color,
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.25s ease',
                }}
              >
                <IconComponent size={22} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{item.desc}</div>
              {isSelected && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', marginTop: '0.25rem' }}>
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Login Card */}
      <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto', padding: '2.5rem', borderTop: `4px solid ${getRoleColor()}` }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="badge badge-info" style={{ textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {role.toUpperCase()} PORTAL
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
            {getRoleTitle()}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enter your registered email and password</p>
        </div>

        {/* 1-Click Quick Demo Buttons */}
        <div style={{ marginBottom: '1.5rem', background: 'var(--primary-light)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={14} /> 1-Click Quick Demo Login:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button type="button" onClick={() => handleDemoFill('customer')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', textAlign: 'left' }}>
              🛒 Priya (Customer)
            </button>
            <button type="button" onClick={() => handleDemoFill('farmer')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', textAlign: 'left' }}>
              🌾 Ramesh (Farmer)
            </button>
            <button type="button" onClick={() => handleDemoFill('delivery')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', textAlign: 'left' }}>
              🛵 Karthik (Delivery)
            </button>
            <button type="button" onClick={() => handleDemoFill('admin')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', textAlign: 'left' }}>
              🛡️ Admin Master
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farmdirect.com"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '1rem', borderRadius: 'var(--radius-pill)' }}>
            {loading ? 'Logging into Portal...' : `Log In to ${role.toUpperCase()} Portal`} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          Don't have an account?{' '}
          <Link to={`/register?role=${role}`} style={{ color: 'var(--primary)', fontWeight: 800 }}>
            Choose your field & Register here →
          </Link>
        </div>
      </div>
    </div>
  );
};

