import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sprout, Tractor, User, Truck, Shield, Store, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { t } = useI18n();

  const roleParam = searchParams.get('role') as any;
  const initialRole = roleParam || 'customer';
  const [role, setRole] = useState<'farmer' | 'customer' | 'delivery' | 'admin' | 'shopkeeper'>(initialRole);

  React.useEffect(() => {
    if (roleParam && ['farmer', 'customer', 'delivery', 'admin', 'shopkeeper'].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [roleParam]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    pincode: '641001',
    farmName: '',
    farmLocation: '',
    vehicleType: 'EV Scooter',
    vehicleNumber: '',
    businessName: '',
    businessType: 'Retail Mart / Supermarket',
    businessRegNo: '',
    city: 'Coimbatore',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register({ ...formData, role });
      if (user.role === 'farmer') navigate('/farmer/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'delivery') navigate('/delivery/dashboard');
      else if (user.role === 'shopkeeper') navigate('/shopkeeper/dashboard');
      else navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleHeaderDesc = () => {
    if (role === 'customer') return 'Register as Customer • ₹500 Welcome Bonus & Rewards';
    if (role === 'shopkeeper') return 'Register as Shopkeeper • Wholesale Rates & Quantity Slabs';
    if (role === 'farmer') return 'Register as Farmer • Direct Marketplace Sales (Pending Approval)';
    if (role === 'delivery') return 'Register as Delivery Partner • Daily Trip Earnings & Incentives';
    if (role === 'admin') return 'Register System Administrator';
    return 'Register Account';
  };

  return (
    <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#ffffff', width: '56px', height: '56px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <Sprout size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
          Create FarmDirect Account
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          Select your registered field category below to complete registration
        </p>
      </div>

      {/* Role / Field Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
        {[
          { id: 'customer', label: 'Customer', icon: User, color: '#10B981' },
          { id: 'shopkeeper', label: 'Shopkeeper', icon: Store, color: '#8B5CF6' },
          { id: 'farmer', label: 'Farmer', icon: Tractor, color: '#059669' },
          { id: 'delivery', label: 'Delivery Boy', icon: Truck, color: '#2563EB' },
          { id: 'admin', label: 'Admin', icon: Shield, color: '#DC2626' },
        ].map((item) => {
          const IconComp = item.icon;
          const isSelected = role === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRole(item.id as any)}
              className="glass-card"
              style={{
                padding: '1rem',
                borderRadius: '14px',
                border: `2px solid ${isSelected ? item.color : 'var(--border-color)'}`,
                background: isSelected ? 'var(--primary-light)' : 'var(--bg-card-solid)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  background: isSelected ? item.color : 'var(--bg-primary)',
                  color: isSelected ? '#ffffff' : item.color,
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconComp size={18} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: '0.7rem', color: isSelected ? item.color : 'var(--text-muted)', fontWeight: 600 }}>
                  {isSelected ? '✓ Selected' : 'Choose Field'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <span className="badge badge-success" style={{ textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {role.toUpperCase()} REGISTRATION
          </span>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{getRoleHeaderDesc()}</p>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">Full Name *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Ramesh Kumar" className="form-input" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">Email Address *</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="e.g. ramesh@farmdirect.com" className="form-input" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">Phone Number *</label>
            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className="form-input" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">Password *</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="form-input" />
          </div>

          {/* Field-Specific Dynamic Inputs */}
          {role === 'farmer' && (
            <>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Farm / Orchard Name *</label>
                <input type="text" name="farmName" required value={formData.farmName} onChange={handleChange} placeholder="e.g. Greenfields Organic Valley" className="form-input" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Farm Location / Landmark *</label>
                <input type="text" name="farmLocation" required value={formData.farmLocation} onChange={handleChange} placeholder="e.g. Pollachi South, Coimbatore" className="form-input" />
              </div>
            </>
          )}

          {role === 'delivery' && (
            <>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Vehicle Type</label>
                <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="form-select">
                  <option value="EV Scooter">EV Cargo Scooter</option>
                  <option value="Pickup Van">Mini Pickup Van</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Vehicle Registration No. *</label>
                <input type="text" name="vehicleNumber" required value={formData.vehicleNumber} onChange={handleChange} placeholder="e.g. TN 37 CZ 9012" className="form-input" />
              </div>
            </>
          )}

          {role === 'shopkeeper' && (
            <>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Business / Shop Name *</label>
                <input type="text" name="businessName" required value={formData.businessName} onChange={handleChange} placeholder="e.g. Murugan Vegetable Mart" className="form-input" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Business Type</label>
                <select name="businessType" value={formData.businessType} onChange={handleChange} className="form-select">
                  <option value="Retail Mart / Supermarket">Retail Mart / Supermarket</option>
                  <option value="Vegetable & Produce Shop">Vegetable & Produce Shop</option>
                  <option value="Restaurant / Catering">Restaurant / Hotel / Catering</option>
                  <option value="Wholesale Distributor">Wholesale Distributor</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Business Registration / GST No. (Optional)</label>
                <input type="text" name="businessRegNo" value={formData.businessRegNo} onChange={handleChange} placeholder="e.g. GST33AABCM1234F1Z5" className="form-input" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Delivery City *</label>
                <select name="city" value={formData.city} onChange={handleChange} className="form-select">
                  <option value="Coimbatore">Coimbatore (Coimbatore Hub)</option>
                  <option value="Chennai">Chennai (Chennai Hub)</option>
                  <option value="Bengaluru">Bengaluru (Bengaluru Hub)</option>
                  <option value="Hyderabad">Hyderabad (Hyderabad Hub)</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Street Address / Door No.</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Street, Village/Area, Landmark" className="form-input" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">District *</label>
            <input type="text" name="district" required value={formData.district} onChange={handleChange} className="form-input" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">Pincode *</label>
            <input type="text" name="pincode" required value={formData.pincode} onChange={handleChange} className="form-input" />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ gridColumn: 'span 2', padding: '0.9rem', fontSize: '1rem', marginTop: '1rem', borderRadius: 'var(--radius-pill)' }}>
            {loading ? 'Creating Account & Registering...' : `Complete Registration as ${role.toUpperCase()}`} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to={`/login?role=${role}`} style={{ color: 'var(--primary)', fontWeight: 800 }}>
            Login to your portal here →
          </Link>
        </div>
      </div>
    </div>
  );
};

