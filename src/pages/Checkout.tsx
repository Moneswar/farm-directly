import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, CreditCard, Truck, CheckCircle2, ArrowRight, ArrowLeft, Building, Package, MapPin, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { apiFetch } from '../services/api';
import { formatCurrency, roundPrice } from '../utils/currency';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { cartItems, cartSubtotal, fetchCart } = useCart();
  const { user } = useAuth();

  const useWalletState = location.state?.useWallet || false;
  const couponCodeState = location.state?.couponCode || '';

  const [deliveryMethod, setDeliveryMethod] = useState<'self_pickup' | 'home_delivery'>('self_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: user?.address || '7B Green Park Apartments, Anna Nagar',
    district: user?.district || 'Coimbatore',
    state: user?.state || 'Tamil Nadu',
    pincode: user?.pincode || '641004',
    landmark: 'Near Agricultural Office',
  });

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'GPay' | 'PhonePe' | 'Paytm' | 'Card' | 'NetBanking' | 'COD' | 'Wallet'>('UPI');
  const [placingOrder, setPlacingOrder] = useState(false);

  const [deliveryCalc, setDeliveryCalc] = useState<{
    deliveryMethod: string;
    deliveryCharge: number;
    deliveryDistanceKm: number;
    hubId: string;
    hubName: string;
    hubAddress: string;
  }>({
    deliveryMethod: 'self_pickup',
    deliveryCharge: 0,
    deliveryDistanceKm: 0,
    hubId: 'hub_cbe',
    hubName: 'Coimbatore Distribution Hub',
    hubAddress: '108 Agricultural Complex, Avinashi Road, Coimbatore',
  });

  const [calcError, setCalcError] = useState<string | null>(null);

  // Synchronize Delivery Calculation with Backend Single Source of Truth
  useEffect(() => {
    let isMounted = true;
    const fetchDeliveryPreview = async () => {
      setCalcError(null);
      if (deliveryMethod === 'home_delivery' && (!deliveryAddress.district || !deliveryAddress.pincode)) {
        setCalcError('Please update your delivery address/location before selecting Home Delivery.');
        return;
      }

      try {
        const res = await apiFetch('/orders/calculate-delivery', {
          method: 'POST',
          body: JSON.stringify({
            district: deliveryAddress.district,
            pincode: deliveryAddress.pincode,
            deliveryMethod,
            latitude: (deliveryAddress as any).latitude,
            longitude: (deliveryAddress as any).longitude,
          }),
        });

        if (res.success && isMounted) {
          setDeliveryCalc(res);
        } else if (isMounted) {
          setCalcError(res.message || 'Unable to calculate delivery distance. Please verify your address.');
        }
      } catch (err: any) {
        if (isMounted) setCalcError('Unable to calculate delivery distance. Please verify your address.');
      }
    };

    fetchDeliveryPreview();
    return () => { isMounted = false; };
  }, [deliveryMethod, deliveryAddress.district, deliveryAddress.pincode]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryMethod === 'home_delivery' && (!deliveryAddress.street || !deliveryAddress.district || !deliveryAddress.pincode)) {
      alert('Please update your delivery address/location before selecting Home Delivery.');
      return;
    }

    setPlacingOrder(true);

    try {
      const orderPayload = {
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddress,
        deliveryMethod,
        paymentMethod,
        couponCode: couponCodeState,
        useWallet: useWalletState,
      };

      const res = await apiFetch('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      if (res.success && res.order) {
        const createdOrder = res.order;

        // Execute Online Payment Flow (if not COD)
        if (paymentMethod !== 'COD') {
          const payRes = await apiFetch('/payments/create', {
            method: 'POST',
            body: JSON.stringify({ orderId: createdOrder.id, paymentMethod }),
          });

          if (payRes.success && payRes.payment) {
            const verifyRes = await apiFetch('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                paymentId: payRes.payment.paymentId,
                orderId: createdOrder.id,
                verificationToken: payRes.verificationToken,
                gatewayTransactionId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                status: 'SUCCESS',
              }),
            });

            if (!verifyRes.success) {
              alert(verifyRes.message || 'Payment verification failed');
            }
          }
        }

        await fetchCart();
        navigate(`/orders?orderId=${createdOrder.id}`, { state: { highlightedOrderId: createdOrder.id } });
      } else {
        alert(res.message || 'Order placement failed');
      }
    } catch (err: any) {
      alert(err.message || 'Order placement failed');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>

      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Direct Farm Checkout</h2>

      <form onSubmit={handlePlaceOrder} style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem' }}>
        {/* Delivery Method, Address & Payment Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 1. DELIVERY METHOD SELECTION */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} style={{ color: 'var(--primary)' }} /> Select Delivery Method
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Option 1: Self Pickup */}
              <label
                style={{
                  padding: '1.1rem',
                  borderRadius: '12px',
                  border: `2px solid ${deliveryMethod === 'self_pickup' ? '#2ECC71' : 'var(--border-color)'}`,
                  background: deliveryMethod === 'self_pickup' ? 'rgba(46, 204, 113, 0.08)' : 'var(--bg-card-solid)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2ECC71' }}>
                    <Building size={18} /> 📦 Self Pickup
                  </span>
                  <input
                    type="radio"
                    name="dm"
                    checked={deliveryMethod === 'self_pickup'}
                    onChange={() => setDeliveryMethod('self_pickup')}
                  />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Collect your order directly from assigned distribution hub.
                </div>
                <span className="badge badge-success" style={{ alignSelf: 'flex-start', marginTop: '4px', fontWeight: 800 }}>
                  FREE (₹0 Delivery Fee)
                </span>
              </label>

              {/* Option 2: Home Delivery */}
              <label
                style={{
                  padding: '1.1rem',
                  borderRadius: '12px',
                  border: `2px solid ${deliveryMethod === 'home_delivery' ? '#3498DB' : 'var(--border-color)'}`,
                  background: deliveryMethod === 'home_delivery' ? 'rgba(52, 152, 219, 0.08)' : 'var(--bg-card-solid)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3498DB' }}>
                    <Truck size={18} /> 🚚 Home Delivery
                  </span>
                  <input
                    type="radio"
                    name="dm"
                    checked={deliveryMethod === 'home_delivery'}
                    onChange={() => setDeliveryMethod('home_delivery')}
                  />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Get your produce delivered to your door address.
                </div>
                <span className="badge badge-info" style={{ alignSelf: 'flex-start', marginTop: '4px', fontWeight: 800 }}>
                  From ₹20 (Distance Slab)
                </span>
              </label>
            </div>

            {/* Self Pickup Hub Details vs Home Delivery Distance */}
            {deliveryMethod === 'self_pickup' ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 800, color: '#2ECC71', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Building size={16} /> Pickup Hub: {deliveryCalc.hubName}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>📍 Address: {deliveryCalc.hubAddress}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                  ⚡ Zero delivery fee. Collect directly from distribution hub when order processing is completed.
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(52, 152, 219, 0.08)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(52, 152, 219, 0.3)', fontSize: '0.85rem', color: '#3498DB', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={16} /> Hub → Customer Distance: {deliveryCalc.deliveryDistanceKm} km • Delivery Fee: ₹{deliveryCalc.deliveryCharge}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Assigned Distribution Hub: {deliveryCalc.hubName}
                </div>
              </div>
            )}

            {/* Error or Location Required Alert */}
            {calcError && (
              <div style={{ marginTop: '0.75rem', padding: '0.85rem', borderRadius: '8px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', color: '#E74C3C', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={16} /> {calcError}
                </span>
                <button type="button" onClick={() => navigate('/profile')} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                  Update Address
                </button>
              </div>
            )}
          </div>

          {/* 2. SHIPPING ADDRESS (Only for Home Delivery or Info) */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} style={{ color: 'var(--primary)' }} /> Customer Delivery Address
            </h3>

            {(!deliveryAddress.street || !deliveryAddress.district || !deliveryAddress.pincode) && deliveryMethod === 'home_delivery' && (
              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', color: '#FF4757', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={16} /> Please complete your delivery address before placing a home-delivery order.
                </span>
                <button type="button" onClick={() => navigate('/profile')} className="btn btn-danger btn-sm">Update Profile</button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Street Address / Door No. *</label>
              <input type="text" required value={deliveryAddress.street} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">City / District (Coimbatore, Chennai, Bengaluru, Hyderabad) *</label>
                <input type="text" required value={deliveryAddress.district} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, district: e.target.value })} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode *</label>
                <input type="text" required value={deliveryAddress.pincode} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })} className="form-input" />
              </div>
            </div>
          </div>

          {/* 3. PAYMENT METHOD */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} style={{ color: 'var(--primary)' }} /> Select Payment Method
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
              {[
                { id: 'UPI', label: 'UPI / QR Code', desc: 'Instant 1-Tap' },
                { id: 'GPay', label: 'Google Pay', desc: 'Secure App' },
                { id: 'PhonePe', label: 'PhonePe', desc: 'Fast UPI' },
                { id: 'Paytm', label: 'Paytm Wallet', desc: 'Direct' },
                { id: 'Card', label: 'Debit / Credit Card', desc: 'Visa / Mastercard' },
                { id: 'NetBanking', label: 'Net Banking', desc: 'All Banks' },
                { id: 'COD', label: 'Cash on Delivery', desc: 'Pay at Door' },
                { id: 'Wallet', label: 'FarmDirect Wallet', desc: 'Balance' },
              ].map((pm) => (
                <label
                  key={pm.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${paymentMethod === pm.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: paymentMethod === pm.id ? 'var(--primary-light)' : 'var(--bg-card-solid)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <input type="radio" name="pm" value={pm.id} checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id as any)} style={{ display: 'none' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pm.label}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{pm.desc}</div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary & Place Order */}
        <div className="glass-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Order Price Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{item.product.name} × {item.quantity}</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Product Selling Subtotal</span>
              <strong>{formatCurrency(cartSubtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Method</span>
              <strong style={{ color: deliveryMethod === 'self_pickup' ? '#2ECC71' : '#3498DB' }}>
                {deliveryMethod === 'self_pickup' ? '📦 Self Pickup (Hub)' : '🚚 Home Delivery'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Charge</span>
              <strong style={{ color: deliveryMethod === 'self_pickup' ? '#2ECC71' : 'var(--text-primary)' }}>
                {deliveryMethod === 'self_pickup' ? '₹0 (FREE)' : formatCurrency(deliveryCalc.deliveryCharge)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <span>Grand Total</span>
              <span>{formatCurrency(cartSubtotal + (deliveryMethod === 'self_pickup' ? 0 : (deliveryCalc.deliveryCharge || 0)))}</span>
            </div>
          </div>

          <div style={{ background: 'var(--primary-light)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} /> 256-Bit Encrypted Secure Checkout
          </div>

          <button type="submit" disabled={placingOrder} className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', borderRadius: 'var(--radius-pill)' }}>
            {placingOrder ? 'Processing...' : 'Confirm & Place Order'} <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
