import React, { useState } from 'react';
import { X, ShoppingCart, Heart, Leaf, Star, MapPin, Calendar, ShieldCheck, Truck, Check, Plus, Minus, Zap } from 'lucide-react';
import { Product } from './ProductCard';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import { formatCurrency, roundPrice, calculateSavings } from '../utils/currency';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
  onNavigateToCart?: () => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({ product, onClose, onNavigateToCart }) => {
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const { t } = useI18n();

  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!product) return null;

  const isWishlisted = wishlist.includes(product.id);
  const { savingsAmount, savingsPercent } = calculateSavings(product.price, (product as any).marketPrice);
  const retailMarketPrice = (product as any).marketPrice && (product as any).marketPrice > product.price
    ? roundPrice((product as any).marketPrice)
    : roundPrice(product.price * 1.38);

  const handleWishlistClick = async () => {
    await toggleWishlist(product.id);
  };

  const handleAddToCart = async () => {
    const targetId = product.id || (product as any)._id;
    await addToCart(targetId, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, backdropFilter: 'blur(10px)', animation: 'fadeIn 0.25s ease-out' }}>
      <div
        className="modal-content glass-card"
        style={{
          maxWidth: '850px',
          width: '95%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 30,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(17, 18, 24, 0.85)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
          title="Close Quick View"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Left Column: Image & Badges */}
          <div style={{ position: 'relative', backgroundColor: 'rgba(0,0,0,0.2)', minHeight: '380px' }}>
            <img
              src={resolveProductImage(product.name, product.category, product.image, product.id)}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '380px' }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getCategoryFallbackSvg(product.name, product.category);
              }}
            />

            <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {product.organic && (
                <span className="badge badge-success" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(17, 18, 24, 0.85)', gap: '4px', fontSize: '0.8rem' }}>
                  <Leaf size={13} /> {t('organic')}
                </span>
              )}
              {savingsAmount > 0 && (
                <span className="badge badge-warning" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(17, 18, 24, 0.85)', gap: '4px', fontSize: '0.8rem' }}>
                  {t('save')} {savingsPercent}% ({formatCurrency(savingsAmount)})
                </span>
              )}
            </div>

            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', background: 'rgba(17, 18, 24, 0.88)', backdropFilter: 'blur(10px)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: 800 }}>
                <Star size={16} fill="#f59e0b" />
                <span>{product.rating} ({product.reviewsCount} customer reviews)</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                Stock: {product.stock} {product.unit}s
              </span>
            </div>
          </div>

          {/* Right Column: Details & Actions */}
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'var(--bg-card-solid)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                {product.category}
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '0.6rem' }}>
                {product.name}
              </h2>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {product.description}
              </p>

              {/* Farmer Origin Box */}
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(46, 204, 113, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(46, 204, 113, 0.2)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.2rem' }}>
                  <MapPin size={15} style={{ color: 'var(--primary)' }} />
                  <span>{t('by')} {product.farmerName} • {product.farmerDistrict}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} style={{ color: 'var(--accent)' }} />
                  <span>Fresh Harvest Date: {product.harvestDate}</span>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Retail Market: <span style={{ textDecoration: 'line-through', color: '#9CA3AF' }}>{formatCurrency(retailMarketPrice * quantity)}</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                    {formatCurrency(product.price * quantity)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>({t('wholesale')})</span>
                  </div>
                </div>

                {/* Quantity Counter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-pill)', padding: '0.3rem 0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions & Guarantees */}
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.85rem', borderRadius: 'var(--radius-pill)', gap: '0.5rem' }}
                >
                  {addedSuccess ? <Check size={18} /> : <ShoppingCart size={18} />}
                  {addedSuccess ? 'Added to Cart!' : `${t('add')} (${quantity} ${product.unit})`}
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className="btn btn-secondary"
                  style={{ borderRadius: 'var(--radius-pill)', padding: '0.85rem 1rem' }}
                  title="Wishlist"
                >
                  <Heart size={18} fill={isWishlisted ? '#FF4757' : 'none'} color={isWishlisted ? '#FF4757' : 'var(--text-primary)'} />
                </button>
              </div>

              {/* Guarantees */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} style={{ color: 'var(--primary)' }} /> FSSAI Tested</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={14} style={{ color: 'var(--info)' }} /> Same Day Pick-up</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={14} style={{ color: 'var(--accent)' }} /> 100% Direct Pay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
