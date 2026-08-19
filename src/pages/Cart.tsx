import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Tag, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import { formatCurrency, roundPrice } from '../utils/currency';

export const Cart: React.FC = () => {
  const { cartItems, updateQuantity, cartSubtotal, applyCoupon, removeCoupon, appliedCoupon, discountPercent, maxDiscount } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [useWallet, setUseWallet] = useState(false);

  const gstAmount = roundPrice(cartSubtotal * 0.05);
  const deliveryCharge = cartSubtotal >= 500 || cartSubtotal === 0 ? 0 : 40;
  const rawDiscount = roundPrice(cartSubtotal * (discountPercent / 100));
  const discountAmount = maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount;

  const rawGrandTotal = roundPrice(Math.max(0, cartSubtotal + gstAmount + deliveryCharge - discountAmount));
  const walletDeduction = useWallet && user ? roundPrice(Math.min(user.walletBalance, rawGrandTotal)) : 0;
  const finalGrandTotal = roundPrice(Math.max(0, rawGrandTotal - walletDeduction));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await applyCoupon(couponCode);
    setCouponMsg(res.message);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode('');
    setCouponMsg('');
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm"
          style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>
        <div className="glass-card" style={{ padding: '3.5rem 2.5rem' }}>
          <ShoppingCart size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your shopping cart is empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Explore fresh vegetables, fruits, and organic honey straight from local farmers.</p>
          <Link to="/" className="btn btn-primary" style={{ borderRadius: 'var(--radius-pill)', padding: '0.85rem 2rem' }}>
            Browse Fresh Produce
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Your Farm Direct Cart</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cartItems.map((item) => (
            <div key={item.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <img
                src={resolveProductImage(item.product.name, item.product.category, item.product.image, item.product.id)}
                alt={item.product.name}
                style={{ width: '90px', height: '90px', borderRadius: '12px', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getCategoryFallbackSvg(item.product.name, item.product.category);
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Farmer: {item.product.farmerName} ({item.product.farmerDistrict})</div>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.2rem 0' }}>{item.product.name}</h4>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                  {formatCurrency(item.product.price)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {item.product.unit}</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.35rem', borderRadius: 'var(--radius-pill)' }}>
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                  <Minus size={14} />
                </button>
                <span style={{ fontWeight: 800, padding: '0 0.5rem' }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                  <Plus size={14} />
                </button>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.15rem', minWidth: '80px', textAlign: 'right' }}>
                {formatCurrency(item.product.price * item.quantity)}
              </div>

              <button onClick={() => updateQuantity(item.productId, 0)} style={{ color: 'var(--danger)', padding: '0.5rem' }} title="Remove item">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="glass-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Order Summary</h3>

          {/* Wholesale Direct Savings Highlight */}
          {(() => {
            const totalMarketValue = roundPrice(
              cartItems.reduce((sum, item) => sum + ((item.product.marketPrice || roundPrice(item.product.price * 1.38)) * item.quantity), 0)
            );
            const totalSavings = roundPrice(totalMarketValue - cartSubtotal);
            return (
              <div style={{ background: 'var(--primary-light)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Retail Supermarket Value:</span>
                  <span style={{ textDecoration: 'line-through', fontWeight: 600 }}>{formatCurrency(totalMarketValue)}</span>
                </div>
                {totalSavings > 0 && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
                    🎉 Direct Wholesale Savings: {formatCurrency(totalSavings)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Coupon Form */}
          {appliedCoupon ? (
            <div style={{ background: 'var(--primary-light)', border: '1px dashed var(--primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={14} /> {appliedCoupon} ({discountPercent}% OFF)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Saving {formatCurrency(discountAmount)} on this order
                </div>
              </div>
              <button type="button" onClick={handleRemoveCoupon} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Tag size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Coupon (e.g. FARM100)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2rem', fontSize: '0.85rem' }}
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
              </div>
              {couponMsg && <div style={{ fontSize: '0.75rem', color: couponMsg.includes('applied') ? 'var(--primary)' : 'var(--danger)', marginTop: '0.4rem', fontWeight: 600 }}>{couponMsg}</div>}
            </form>
          )}

          {/* Wallet Balance Toggle */}
          {user && user.walletBalance > 0 && (
            <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Use Wallet Balance</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available: {formatCurrency(user.walletBalance)}</div>
              </div>
              <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
            </div>
          )}

          {/* Breakdown Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span> <span style={{ fontWeight: 600 }}>{formatCurrency(cartSubtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>GST (5%):</span> <span style={{ fontWeight: 600 }}>{formatCurrency(gstAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Charge:</span> <span style={{ fontWeight: 600 }}>{deliveryCharge === 0 ? <strong style={{ color: 'var(--primary)' }}>FREE</strong> : formatCurrency(deliveryCharge)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                <span>Coupon Discount ({discountPercent}%):</span> <span style={{ fontWeight: 700 }}>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {walletDeduction > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                <span>Wallet Used:</span> <span style={{ fontWeight: 700 }}>-{formatCurrency(walletDeduction)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '0.75rem', fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>
              <span>Grand Total:</span> <span>{formatCurrency(finalGrandTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout', { state: { useWallet, couponCode: appliedCoupon } })}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 'var(--radius-pill)' }}
          >
            Proceed to Checkout <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
