import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Wallet, Award, History, PlusCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { apiFetch } from '../services/api';

export const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, refreshUser, updateUser } = useAuth();
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const [recharging, setRecharging] = useState(false);

  // Edit Profile / Address State
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    district: user?.district || 'Coimbatore',
    state: user?.state || 'Tamil Nadu',
    pincode: user?.pincode || '641001',
  });

  React.useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        district: user.district || 'Coimbatore',
        state: user.state || 'Tamil Nadu',
        pincode: user.pincode || '641001',
      });
    }
  }, [user]);

  const handleWalletRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecharging(true);
    try {
      const res = await apiFetch('/customer/wallet/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(rechargeAmount) }),
      });
      if (res.success) {
        alert(res.message);
        await refreshUser();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecharging(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      if (res.success) {
        alert('Delivery address and profile updated successfully!');
        if (updateUser) {
          updateUser(res.user);
        }
        await refreshUser();
        setIsEditing(false);
      } else {
        alert(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      {/* Profile Banner */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <img src={user?.profileImage || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'} alt={user?.name} style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ffffff' }} />
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{user?.name}</h1>
              <p style={{ color: '#a7f3d0', fontSize: '0.9rem' }}>{user?.email} • {user?.phone}</p>
              <div style={{ marginTop: '0.4rem' }}>
                <span className="badge badge-warning" style={{ color: '#ffffff' }}><Award size={14} /> Tier: {user?.loyaltyTier || 'Silver'} ({user?.rewardPoints || 0} pts)</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#a7f3d0', textTransform: 'uppercase' }}>Wallet Balance</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>₹{user?.walletBalance || 0}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Wallet Recharge Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={20} style={{ color: 'var(--primary)' }} /> Recharge Wallet
          </h3>

          <form onSubmit={handleWalletRecharge}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" min="100" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} className="form-input" />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {['200', '500', '1000', '2000'].map((amt) => (
                <button key={amt} type="button" onClick={() => setRechargeAmount(amt)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  +₹{amt}
                </button>
              ))}
            </div>

            <button type="submit" disabled={recharging} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
              <PlusCircle size={18} /> {recharging ? 'Adding Money...' : 'Recharge Wallet via UPI'}
            </button>
          </form>
        </div>

        {/* Address & Settings */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} style={{ color: 'var(--primary)' }} /> Delivery Address & Details
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Street Address / Door No.</label>
                <input
                  type="text"
                  required
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="e.g. 14B Green Park, Anna Nagar"
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>City / District</label>
                  <input
                    type="text"
                    required
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Pincode</label>
                  <input
                    type="text"
                    required
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>State</label>
                <input
                  type="text"
                  required
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem', padding: '0.65rem' }}
              >
                {savingProfile ? 'Saving Address...' : 'Save Delivery Address'}
              </button>
            </form>
          ) : (
            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div><strong>Name:</strong> {user?.name || 'Customer'}</div>
              <div><strong>Phone:</strong> {user?.phone || 'Not provided'}</div>
              <div><strong>Street Address:</strong> {user?.address || '7B Green Park, Anna Nagar'}</div>
              <div><strong>District:</strong> {user?.district || 'Chennai'}, {user?.state || 'Tamil Nadu'}</div>
              <div><strong>Pincode:</strong> {user?.pincode || '600040'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
