import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Trash2, Plus, Minus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import { formatCurrency, roundPrice } from '../utils/currency';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, cartSubtotal } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const gstAmount = roundPrice(cartSubtotal * 0.05);
  const deliveryCharge = cartSubtotal >= 500 || cartSubtotal === 0 ? 0 : 40;
  const grandTotal = roundPrice(Math.max(0, cartSubtotal + gstAmount + deliveryCharge));

  return (
    <div className="modal-overlay" style={{ zIndex: 1200, justifyContent: 'flex-end', padding: 0, backdropFilter: 'blur(6px)' }}>
      <div
        className="glass-card"
        style={{
          width: '420px',
          maxWidth: '100%',
          height: '100vh',
          borderRadius: 0,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          animation: 'slideLeft 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShoppingCart size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Your Shopping Cart</h3>
            <span className="badge badge-success" style={{ borderRadius: 'var(--radius-pill)' }}>{cartItems.length} items</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card-solid)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h4>Your cart is empty</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Add fresh organic produce straight from local farms!</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem',
                  background: 'var(--bg-card-solid)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <img
                  src={resolveProductImage(item.product.name, item.product.category, item.product.image, item.product.id)}
                  alt={item.product.name}
                  style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getCategoryFallbackSvg(item.product.name, item.product.category);
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{item.product.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800 }}>
                    {formatCurrency(item.product.price)} / {item.product.unit}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatCurrency(item.product.price * item.quantity)}</div>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, 0)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: '0.4rem', padding: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        {cartItems.length > 0 && (
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              <span>Delivery Fee:</span>
              <span>{deliveryCharge === 0 ? <span style={{ color: '#22c55e', fontWeight: 700 }}>FREE</span> : formatCurrency(deliveryCharge)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, margin: '0.75rem 0', color: 'var(--text-primary)' }}>
              <span>Grand Total:</span>
              <span style={{ color: 'var(--primary)' }}>{formatCurrency(grandTotal)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
                className="btn btn-primary"
                style={{ padding: '0.85rem', borderRadius: 'var(--radius-pill)', gap: '0.5rem', width: '100%' }}
              >
                Proceed to Checkout <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/cart');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.65rem', borderRadius: 'var(--radius-pill)', width: '100%', fontSize: '0.85rem' }}
              >
                View Full Cart Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
