import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  Navigation,
  Phone,
  MapPin,
  KeyRound,
  ShieldCheck,
  DollarSign,
  PackageCheck,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  Wallet,
  AlertCircle,
  Camera,
  FileCheck,
  RefreshCw,
  Power,
  ChevronRight,
  Award,
  Calendar,
  Send,
  X,
  Package,
  Building,
  ArrowLeft,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';

export const DeliveryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, refetchUser, updateUserLocal } = useAuth();
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Agent Status & Navigation State
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'pickups' | 'accepted' | 'delivered' | 'earnings'>('collections');
  const [collectionsList, setCollectionsList] = useState<any[]>([]);
  const [payoutsList, setPayoutsList] = useState<any[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);

  // Delivery Modal / OTP Verification
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [reachedOrderId, setReachedOrderId] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [signatureText, setSignatureText] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [deliverySuccessMessage, setDeliverySuccessMessage] = useState<string | null>(null);

  // Withdrawal Modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiIdInput, setUpiIdInput] = useState('agent@upi');

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const [ordersRes, collectionsRes, payoutsRes] = await Promise.all([
        apiFetch('/orders'),
        apiFetch('/collections'),
        apiFetch('/delivery/payouts'),
      ]);
      if (ordersRes.success) setAssignedOrders(ordersRes.orders || []);
      if (collectionsRes?.success) setCollectionsList(collectionsRes.collections || []);
      if (payoutsRes?.success) {
        setPayoutsList(payoutsRes.payouts || []);
        if (payoutsRes.settlementSummary) setSettlementSummary(payoutsRes.settlementSummary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    if (clean.length > 1) {
      const chars = clean.split('').slice(0, 6);
      chars.forEach((c, i) => {
        if (index + i < 6) newDigits[index + i] = c;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(5, index + chars.length);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }
    newDigits[index] = clean;
    setOtpDigits(newDigits);
    setOtpError('');
    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, idx) => {
      if (idx < 6) newDigits[idx] = char;
    });
    setOtpDigits(newDigits);
    setOtpError('');
    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleUpdateStatus = async (orderId: string, status: string, extraPayload: any = {}) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extraPayload }),
      });
      if (res.success) {
        alert(res.message);
        setSelectedOrder(null);
        setReachedOrderId(null);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
        setSignatureText('');
        setProofImage('');
        if (status === 'Delivered') {
          setActiveTab('delivered');
          const newBal = res.walletBalance ?? ((user?.walletBalance || 0) + 60);
          updateUserLocal({ walletBalance: newBal });
          await refetchUser();
        } else if (status === 'Pickup Complete' || status === 'Out for Delivery') {
          setActiveTab('accepted');
        }
        loadDeliveries();
      } else {
        setOtpError(res.message || 'Status update failed.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'An error occurred.');
    }
  };

  const handleVerifyDeliveryOtp = async (orderId: string) => {
    const fullOtp = otpDigits.join('').trim();
    if (fullOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the customer delivery OTP.');
      return;
    }

    try {
      setVerifying(true);
      setOtpError('');
      const res = await apiFetch(`/orders/${orderId}/verify-delivery-otp`, {
        method: 'POST',
        body: JSON.stringify({
          otp: fullOtp,
          digitalSignature: signatureText || 'Verified Digitally via Delivery OTP',
          deliveryProofImage: proofImage || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500',
        }),
      });

      if (res.success) {
        setDeliverySuccessMessage(`✓ Delivery Completed. Order #${orderId} delivered successfully. Earning: +₹${res.payoutEarned || 60}`);
        setSelectedOrder(null);
        setReachedOrderId(null);
        setOtpDigits(['', '', '', '', '', '']);
        setSignatureText('');
        setProofImage('');

        const newBal = res.walletBalance ?? ((user?.walletBalance || 0) + (res.payoutEarned || 60));
        updateUserLocal({ walletBalance: newBal });
        await refetchUser();
        await loadDeliveries();
        setActiveTab('delivered');
      } else {
        setOtpError(res.message || 'Invalid delivery OTP. Please ask the customer to provide the correct OTP.');
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setOtpError(err.message || 'Invalid delivery OTP. Please ask the customer to provide the correct OTP.');
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpVerifyAndDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    await handleVerifyDeliveryOtp(selectedOrder.id);
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryBoyId: user?.id }),
      });
      if (res.success) {
        alert(`🎉 Order #${orderId} accepted! Assigned to you. Opening Pickup & Delivery details...`);
        setActiveTab('pickups');
        loadDeliveries();
      } else {
        alert(res.message || 'Failed to accept order.');
      }
    } catch (err: any) {
      alert(err.message || 'Error accepting order.');
    }
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    const currentBalance = user?.walletBalance || 0;
    if (amt > currentBalance) {
      alert(`Insufficient balance! Your current wallet balance is ₹${currentBalance}.`);
      return;
    }
    alert(`🎉 Withdrawal request of ₹${amt} sent to ${upiIdInput}! Funds will be credited in 2 hours.`);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
  };

  // Filter Home Delivery Orders
  const hubHomeOrders = assignedOrders.filter((o) => o.deliveryMethod !== 'self_pickup');

  const unassignedOrders = hubHomeOrders.filter(
    (o) => (!o.deliveryBoyId || o.deliveryBoyId === '') &&
      (o.orderStatus === 'Confirmed' ||
       o.orderStatus === 'Assigned' ||
       o.orderStatus === 'Hub Processing' ||
       o.orderStatus === 'Pending Processing' ||
       o.orderStatus === 'Pending')
  );
  const myOrders = hubHomeOrders.filter(
    (o) => o.deliveryBoyId === user?.id
  );

  const pickupOrders = myOrders.filter((o) => o.orderStatus === 'Assigned' || o.orderStatus === 'Confirmed' || o.orderStatus === 'Pending Processing');
  const activeOrders = myOrders.filter((o) => o.orderStatus === 'Pickup Complete' || o.orderStatus === 'Out for Delivery' || o.orderStatus === 'Picked Up from Hub');
  const deliveredOrders = myOrders.filter((o) => o.orderStatus === 'Delivered');

  // Total Earnings calculation
  const totalCompletedEarnings = deliveredOrders.length * 60; // Flat ₹60 per delivery
  const walletBalance = user?.walletBalance || totalCompletedEarnings;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      {/* Header Profile & Online Status Switch */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          background: isOnline ? 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)' : 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
          color: '#ffffff',
          border: isOnline ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                background: isOnline ? '#10B981' : '#6B7280',
                color: '#ffffff',
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                boxShadow: isOnline ? '0 8px 24px rgba(16, 185, 129, 0.4)' : 'none',
              }}
            >
              <Truck size={36} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{user?.name || 'Delivery Partner'}</h1>
                <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#2ECC71' : '#FF4757', display: 'inline-block' }} />
                  {isOnline ? 'ONLINE • READY FOR TRIPS' : 'OFFLINE • DUTY PAUSED'}
                </span>
              </div>
              <p style={{ color: '#A7F3D0', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                🛵 {user?.vehicleType || 'EV Scooter'} • {user?.vehicleNumber || 'TN-37-CZ-9012'} • Hub: {user?.district || 'Chennai Hub'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#A7F3D0', textTransform: 'uppercase', fontWeight: 700 }}>Wallet Earnings</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34D399' }}>₹{walletBalance}</div>
            </div>

            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`btn ${isOnline ? 'btn-danger' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.25rem' }}
            >
              <Power size={18} />
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '5px solid #3B82F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ready Pickups</span>
            <PackageCheck size={20} style={{ color: '#3B82F6' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3B82F6' }}>{pickupOrders.length}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned at farm hubs</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '5px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Deliveries</span>
            <Navigation size={20} style={{ color: '#F59E0B' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B' }}>{activeOrders.length}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En-route to customer</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '5px solid #10B981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Delivered Trips</span>
            <CheckCircle2 size={20} style={{ color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981' }}>{deliveredOrders.length}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OTP Verified & Completed</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '5px solid #8B5CF6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Payout Rate</span>
            <DollarSign size={20} style={{ color: '#8B5CF6' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#8B5CF6' }}>₹60<span style={{ fontSize: '0.9rem', fontWeight: 500 }}>/trip</span></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Per Delivered Customer Order</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('collections')}
          className={`btn ${activeTab === 'collections' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <Building size={16} /> 🌾 Farmer Collections ({collectionsList.filter((c) => !user || c.deliveryBoyId === user.id || c.status === 'Collection Pending' || c.status === 'Collection Assigned').length})
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Navigation size={16} /> GPS & Live Overview
        </button>

        <button
          onClick={() => setActiveTab('pickups')}
          className={`btn ${activeTab === 'pickups' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <PackageCheck size={16} /> Available & Pickup Orders ({unassignedOrders.length + pickupOrders.length})
          {unassignedOrders.length > 0 && (
            <span
              style={{
                background: '#F59E0B',
                color: '#fff',
                borderRadius: '50%',
                padding: '2px 7px',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginLeft: '6px',
              }}
            >
              {unassignedOrders.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('accepted')}
          className={`btn ${activeTab === 'accepted' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)', position: 'relative' }}
        >
          <Truck size={16} /> Accepted / Active ({activeOrders.length})
          {activeOrders.length > 0 && (
            <span
              style={{
                background: '#F59E0B',
                color: '#fff',
                borderRadius: '50%',
                padding: '2px 7px',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginLeft: '6px',
              }}
            >
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('delivered')}
          className={`btn ${activeTab === 'delivered' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <CheckCircle2 size={16} /> Delivered History ({deliveredOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('earnings')}
          className={`btn ${activeTab === 'earnings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-pill)' }}
        >
          <Wallet size={16} /> Agent Earnings & Payouts
        </button>
      </div>

      {/* TAB 0: FARMER COLLECTIONS */}
      {activeTab === 'collections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🌾 Farmer Collection Tasks (Farm → Distribution Hub Logistics)
          </h3>

          {collectionsList.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
              <h4>No Active Farmer Collection Tasks</h4>
              <p style={{ fontSize: '0.875rem' }}>You have no pending produce pickup requests from farmers at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {collectionsList.map((col) => (
                <div key={col.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', borderLeft: '6px solid #10B981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 900, color: '#10B981', fontSize: '1rem' }}>{col.id}</span>
                    <span className="badge badge-info">{col.status}</span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                    📦 {col.productName} ({col.expectedQuantity} {col.unit})
                  </h4>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div>👨‍🌾 <strong>Farmer:</strong> {col.farmerName} ({col.farmerPhone || '+91 98765 43210'})</div>
                    <div>📍 <strong>Pickup:</strong> {col.farmerLocation} Farm</div>
                    <div>🏭 <strong>Destination Hub:</strong> {col.hubName}</div>
                    <div>🚚 <strong>Distance:</strong> {col.transportDistanceKm || 45} km (Est. Transport: ₹{col.farmerToHubTransportCost || 2.25}/kg)</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(col.status === 'Collection Pending' || col.status === 'Collection Assigned') && (
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`/collections/${col.id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'Collection Accepted' }),
                          });
                          if (res.success) {
                            alert(res.message);
                            loadDeliveries();
                          }
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                      >
                        [Accept Collection Task]
                      </button>
                    )}

                    {col.status === 'Collection Accepted' && (
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`/collections/${col.id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'Collected' }),
                          });
                          if (res.success) {
                            alert(res.message);
                            loadDeliveries();
                          }
                        }}
                        className="btn btn-success btn-sm"
                        style={{ flex: 1 }}
                      >
                        [Mark Picked Up from Farmer]
                      </button>
                    )}

                    {col.status === 'In Transit' && (
                      <button
                        onClick={async () => {
                          const res = await apiFetch(`/collections/${col.id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'Arrived at Hub' }),
                          });
                          if (res.success) {
                            alert(res.message);
                            loadDeliveries();
                          }
                        }}
                        className="btn btn-warning btn-sm"
                        style={{ flex: 1 }}
                      >
                        [Mark Arrived at Distribution Hub]
                      </button>
                    )}

                    {col.status === 'Arrived at Hub' && (
                      <div style={{ fontSize: '0.8rem', color: '#F39C12', fontWeight: 700, padding: '0.4rem 0.8rem', background: 'rgba(243, 156, 18, 0.1)', borderRadius: '8px', width: '100%', textAlign: 'center' }}>
                        ⏳ Arrived at Hub — Awaiting physical receipt by Hub Operator.
                      </div>
                    )}

                    {col.status === 'Received at Hub' && (
                      <div style={{ fontSize: '0.8rem', color: '#2ECC71', fontWeight: 800, padding: '0.4rem 0.8rem', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px', width: '100%', textAlign: 'center' }}>
                        ✅ Successfully received into Hub Inventory!
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW & LIVE GPS ROUTE MAP */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Simulated Active GPS Route */}
          <div className="glass-card" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Navigation size={22} style={{ color: '#3B82F6' }} /> Live GPS Navigation & Route Dispatcher
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Real-time turn-by-turn route mapping from Farm Hub to Customer Location
                </p>
              </div>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={14} /> GPS Lock Active (99.8% Accuracy)
              </span>
            </div>

            {/* Simulated Live Route Canvas */}
            <div
              style={{
                height: '220px',
                background: '#0B131F',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.2,
                  backgroundImage: 'radial-gradient(#3B82F6 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }}
              />

              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#10B981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
                    🏭 Pickup: {activeOrders[0]?.hubName || activeOrders[0]?.deliveryHubName || 'Distribution Hub'}
                  </div>
                  <div style={{ borderTop: '3px dashed #3B82F6', width: '80px', position: 'relative' }}>
                    <Truck size={20} style={{ position: 'absolute', top: '-12px', left: '30px', color: '#34D399' }} />
                  </div>
                  <div style={{ background: '#EF4444', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
                    🏠 Destination: {activeOrders[0]?.deliveryAddress?.street || 'Customer Address'}, {activeOrders[0]?.deliveryAddress?.district || ''}
                  </div>
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#F3F4F6' }}>
                  {activeOrders.length > 0 ? `Active Delivery: Order #${activeOrders[0].id} (${activeOrders[0].customerName})` : 'No active trip in transit'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                  Distance: {activeOrders[0]?.deliveryDistanceKm || 6.5} km • Delivery Fee: ₹{activeOrders[0]?.deliveryCharge || 30} • ETA: 15 mins
                </div>
              </div>
            </div>
          </div>

          {/* New Customer Orders Available to Accept */}
          {unassignedOrders.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '5px solid #F59E0B', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  ⚡ New Customer Orders Ready to Accept ({unassignedOrders.length})
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click Accept to take trip & start delivery</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {unassignedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card-solid)',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>Order #{ord.id}</span>
                        <span className="badge badge-warning">Unassigned • Waiting for Acceptance</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.35rem', fontWeight: 700 }}>
                        👤 Customer: {ord.customerName} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ord.customerPhone})</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        📍 {ord.deliveryAddress?.street}, {ord.deliveryAddress?.district} ({ord.deliveryAddress?.pincode})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>₹{ord.grandTotal}</div>
                        <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>+₹60 Payout</div>
                      </div>
                      <button
                        onClick={() => handleAcceptOrder(ord.id)}
                        className="btn btn-primary"
                        style={{ background: '#10B981', border: 'none', padding: '0.7rem 1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Truck size={16} /> Accept Order Trip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PICKUP ORDERS & AVAILABLE TRIPS */}
      {activeTab === 'pickups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Available Unassigned Trips Section */}
          {unassignedOrders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚡ Available New Orders to Accept ({unassignedOrders.length})
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Accept a trip to take delivery assignment & contact customer
                </span>
              </div>

              {unassignedOrders.map((ord) => (
                <div key={ord.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: '5px solid #F59E0B', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>Order #{ord.id}</span>
                        <span className="badge badge-warning">Unassigned • Open for Delivery</span>
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '0.2rem' }}>
                        👤 Customer: {ord.customerName} ({ord.customerPhone})
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        📍 Delivery Location: {ord.deliveryAddress?.street}, {ord.deliveryAddress?.district} ({ord.deliveryAddress?.pincode})
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)' }}>₹{ord.grandTotal}</div>
                      <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>Earn +₹60.00 Payout</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      🌾 Produce: {ord.items?.map((i: any) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </div>
                    <button
                      onClick={() => handleAcceptOrder(ord.id)}
                      className="btn btn-primary"
                      style={{ background: '#10B981', border: 'none', padding: '0.75rem 1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Truck size={18} /> Accept & Start Delivery Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assigned Pickups Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>📦 My Assigned Farm Pickups ({pickupOrders.length})</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Visit farmer locations to pick up packaged produce.
              </span>
            </div>

            {pickupOrders.length === 0 ? (
              <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <PackageCheck size={44} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>No Pickup Trips Assigned Currently</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {unassignedOrders.length > 0 ? 'Accept an available order above to start!' : 'New farm orders placed by customers will appear here for pickup.'}
                </p>
              </div>
            ) : (
              pickupOrders.map((ord) => (
                <div key={ord.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: '5px solid #3B82F6', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>Order #{ord.id}</span>
                        <span className="badge badge-info">Assigned for Pickup</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Customer: <strong>{ord.customerName}</strong> ({ord.customerPhone})
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)' }}>₹{ord.grandTotal}</div>
                      <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>Agent Commission: +₹60</div>
                    </div>
                  </div>

                  {/* Distribution Hub Pickup Details */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      padding: '1.1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      marginBottom: '1rem',
                    }}
                  >
                    <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#3B82F6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building size={16} /> Pickup Source: {ord.hubName || ord.deliveryHubName || 'Coimbatore Distribution Hub'}
                    </h4>
                    
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Produce Items to Deliver:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {ord.items?.map((item: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>• {item.productName} ({item.quantity} {item.unit})</span>
                          <span style={{ fontWeight: 700 }}>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Route & Distance Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div>📍 Destination: <strong>{ord.customerName}</strong> — {ord.deliveryAddress?.street}, {ord.deliveryAddress?.district} ({ord.deliveryAddress?.pincode})</div>
                      <div>🚚 Delivery Distance: <strong>{ord.deliveryDistanceKm || 6.5} km</strong> • Delivery Charge: <strong>₹{ord.deliveryCharge || 30}</strong></div>
                    </div>

                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'Picked Up from Hub')}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
                    >
                      <PackageCheck size={18} /> Confirm Picked Up from Hub
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUCCESS FEEDBACK BANNER */}
      {deliverySuccessMessage && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
            border: '1.5px solid #10B981',
            color: '#10B981',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={22} />
            <span>{deliverySuccessMessage}</span>
          </div>
          <button
            onClick={() => setDeliverySuccessMessage(null)}
            style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* TAB 3: ACCEPTED & ACTIVE DELIVERIES */}
      {activeTab === 'accepted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>🛵 Active En-Route Deliveries ({activeOrders.length})</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Deliver produce directly to customer addresses and verify customer 6-digit OTP.
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Truck size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>No Active Deliveries En-Route</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                Accept an order from the "Pickup Orders" tab to start your trip.
              </p>
            </div>
          ) : (
            activeOrders.map((ord) => (
              <div key={ord.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: '5px solid #F59E0B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>Order #{ord.id}</span>
                      <span className="badge badge-warning">{ord.orderStatus}</span>
                      {reachedOrderId === ord.id && (
                        <span className="badge badge-success" style={{ fontWeight: 800 }}>📍 Reached Customer</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                      👤 Customer: <strong>{ord.customerName}</strong> ({ord.customerPhone})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      📍 Street Address: {ord.deliveryAddress?.street}, {ord.deliveryAddress?.district}, {ord.deliveryAddress?.state} - {ord.deliveryAddress?.pincode}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(52, 152, 219, 0.12)',
                        border: '1px solid rgba(52, 152, 219, 0.4)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        marginTop: '0.5rem',
                        color: '#3498DB',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      <Building size={14} /> Assigned Hub: {ord.hubName || 'Coimbatore Distribution Hub'} ({ord.hubStatus || 'Pending Processing'})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)' }}>
                      ₹{ord.grandTotal} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({ord.paymentMethod})</span>
                    </div>
                    <a
                      href={`tel:${ord.customerPhone}`}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Phone size={14} /> Call Customer
                    </a>
                  </div>
                </div>

                {/* Logistics Task Banner */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {ord.orderStatus === 'Assigned' && (
                    <span style={{ color: '#F39C12' }}>🌾 Current Task: Travel to Farmer Location & Pick Up Produce</span>
                  )}
                  {ord.orderStatus === 'Pickup Complete' && (
                    <span style={{ color: '#3498DB' }}>🚚 Current Task: Deliver Produce to {ord.hubName || 'Distribution Hub'}</span>
                  )}
                  {ord.orderStatus === 'Arrived at Hub' && (
                    <span style={{ color: '#8E44AD' }}>🏭 Current Task: Order in Hub — Start Hub Processing & Quality Check</span>
                  )}
                  {ord.orderStatus === 'Hub Processing' && (
                    <span style={{ color: '#E67E22' }}>📦 Current Task: Hub Processing Complete — Dispatch Order for Final Delivery</span>
                  )}
                  {ord.orderStatus === 'Out for Delivery' && (
                    <span style={{ color: '#2ECC71' }}>🛵 Current Task: En-Route to Customer & Collect 6-Digit Delivery OTP</span>
                  )}
                </div>

                {/* Delivery Action Controls */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1.1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={18} style={{ color: '#EF4444' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Hub: <strong>{ord.hubName || 'Regional Hub'}</strong> • Customer: {ord.deliveryAddress?.district}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {ord.orderStatus === 'Assigned' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'Pickup Complete')}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <PackageCheck size={16} /> Confirm Picked Up from Farmer
                      </button>
                    )}

                    {ord.orderStatus === 'Pickup Complete' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'Arrived at Hub')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3498DB', border: 'none' }}
                      >
                        <Building size={16} /> Mark Arrived at Hub
                      </button>
                    )}

                    {ord.orderStatus === 'Arrived at Hub' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'Hub Processing')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8E44AD', border: 'none' }}
                      >
                        <RefreshCw size={16} /> Start Hub Processing
                      </button>
                    )}

                    {ord.orderStatus === 'Hub Processing' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'Out for Delivery')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#E67E22', border: 'none' }}
                      >
                        <Truck size={16} /> Dispatch from Hub
                      </button>
                    )}

                    {(ord.orderStatus === 'Out for Delivery' || ord.orderStatus === 'Picked Up from Hub') && (
                      <>
                        {reachedOrderId !== ord.id ? (
                          <button
                            onClick={() => {
                              setReachedOrderId(ord.id);
                              setSelectedOrder(ord);
                              setOtpDigits(['', '', '', '', '', '']);
                              setOtpError('');
                            }}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F59E0B', border: 'none', fontWeight: 800 }}
                          >
                            <MapPin size={16} /> Reached Customer
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setOtpDigits(['', '', '', '', '', '']);
                              setOtpError('');
                            }}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10B981', border: 'none', fontWeight: 800 }}
                          >
                            <KeyRound size={16} /> Verify OTP & Deliver
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* INLINE CUSTOMER REACHED & 6-DIGIT OTP VERIFICATION SECTION */}
                {reachedOrderId === ord.id && (
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)',
                      borderRadius: '14px',
                      border: '1.5px solid #10B981',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-success" style={{ fontWeight: 800 }}>📍 Customer Reached</span>
                          <h4 style={{ margin: 0, fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                            Delivery Verification
                          </h4>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Ask customer <strong>{ord.customerName}</strong> for the 6-digit OTP shown on their order tracking screen.
                        </p>
                      </div>
                      <button
                        onClick={() => { setReachedOrderId(null); setSelectedOrder(null); }}
                        className="btn btn-secondary btn-sm"
                      >
                        Close
                      </button>
                    </div>

                    {otpError && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} /> {otpError}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                          Enter Customer's 6-Digit Delivery OTP:
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '380px' }}>
                          {otpDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => { otpInputRefs.current[idx] = el; }}
                              type="text"
                              maxLength={1}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={digit}
                              onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              onPaste={handleOtpPaste}
                              style={{
                                flex: 1,
                                height: '52px',
                                textAlign: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 900,
                                background: '#000000',
                                color: '#10B981',
                                border: digit ? '2px solid #10B981' : '1.5px solid var(--border-color)',
                                borderRadius: '10px',
                                outline: 'none',
                              }}
                              autoFocus={idx === 0}
                            />
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleVerifyDeliveryOtp(ord.id)}
                          disabled={verifying || otpDigits.join('').length !== 6}
                          className="btn btn-primary"
                          style={{
                            background: '#10B981',
                            border: 'none',
                            fontWeight: 900,
                            padding: '0.85rem 1.75rem',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: (verifying || otpDigits.join('').length !== 6) ? 0.6 : 1,
                            cursor: (verifying || otpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <KeyRound size={18} /> {verifying ? 'Verifying OTP...' : 'Verify & Complete Delivery'}
                        </button>

                        <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 700 }}>
                          💰 +₹60 Payout will be credited upon verification
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: DELIVERED CUSTOMER ORDERS HISTORY */}
      {activeTab === 'delivered' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
            ✅ Delivered History ({deliveredOrders.length})
          </h3>

          {deliveredOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No completed deliveries recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deliveredOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-card-solid) 100%)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, color: '#10B981', fontSize: '1.1rem' }}>Order #{ord.id}</span>
                      <span className="badge badge-success">✓ Delivered & OTP Verified</span>
                      {ord.deliveredAt && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🕒 {new Date(ord.deliveredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.35rem' }}>
                      Customer: <strong>{ord.customerName}</strong> ({ord.customerPhone})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      📍 {ord.deliveryAddress?.street}, {ord.deliveryAddress?.district}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, marginTop: '0.25rem' }}>
                      ✓ Delivery Verification: OTP Verified & Completed
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>₹{ord.grandTotal}</div>
                    <div style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 800 }}>+₹60.00 Payout Credited</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AGENT EARNINGS & PAYOUTS */}
      {activeTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#99F6E4', textTransform: 'uppercase', fontWeight: 700 }}>Total Wallet Payout Balance</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#CCFBF1', marginTop: '0.25rem' }}>₹{walletBalance}</div>
                <p style={{ fontSize: '0.85rem', color: '#99F6E4', marginTop: '0.35rem' }}>
                  Includes ₹60 flat rate per completed customer delivery + performance bonuses.
                </p>
              </div>

              <button
                onClick={() => setShowWithdrawModal(true)}
                className="btn btn-primary"
                style={{ background: '#2DD4BF', color: '#0F766E', fontWeight: 900, padding: '0.85rem 1.75rem', border: 'none' }}
              >
                Withdraw Funds to UPI
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>📊 Delivery Payout Statement</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {deliveredOrders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  No trip payouts recorded yet. Deliver customer orders to earn ₹60 per trip!
                </p>
              ) : (
                deliveredOrders.map((ord) => (
                  <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Customer Delivery Trip: Order #{ord.id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer: {ord.customerName}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#10B981' }}>+₹60.00</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* OTP VERIFICATION MODAL */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', background: 'var(--bg-card-solid)', borderRadius: '20px', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} /> Verify Customer Delivery OTP
              </h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Order <strong>#{selectedOrder.id}</strong> • Customer: <strong>{selectedOrder.customerName}</strong>
            </div>

            {otpError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> {otpError}
              </div>
            )}

            <form onSubmit={handleOtpVerifyAndDeliver} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Enter Customer 6-Digit Delivery OTP:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      style={{
                        flex: 1,
                        height: '52px',
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        background: '#000000',
                        color: '#10B981',
                        border: digit ? '2px solid #10B981' : '1.5px solid var(--border-color)',
                        borderRadius: '10px',
                        outline: 'none',
                      }}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Digital Signature (Optional):
                </label>
                <input
                  type="text"
                  placeholder="Customer signature / name"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedOrder(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || otpDigits.join('').length !== 6}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: '#10B981',
                    border: 'none',
                    fontWeight: 900,
                    opacity: (verifying || otpDigits.join('').length !== 6) ? 0.6 : 1,
                    cursor: (verifying || otpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {verifying ? 'Verifying...' : 'Verify & Complete Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', background: 'var(--bg-card-solid)', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>💸 Withdraw Agent Payout</h3>
              <button onClick={() => setShowWithdrawModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWithdrawalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Amount (Max ₹{walletBalance}):</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>UPI ID / GPay Number:</label>
                <input
                  type="text"
                  placeholder="agent@upi"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ background: '#2DD4BF', color: '#0F766E', fontWeight: 900, border: 'none', marginTop: '0.5rem' }}>
                Submit Payout Request
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
