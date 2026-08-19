import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Leaf, MapPin, Calendar, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import { formatCurrency, roundPrice, calculateSavings } from '../utils/currency';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  quantity: number;
  unit: string;
  organic: boolean;
  image: string;
  farmerId: string;
  farmerName: string;
  farmerDistrict: string;
  harvestDate: string;
  stock: number;
  rating: number;
  reviewsCount: number;
}

export const ProductCard: React.FC<{ product: Product; onQuickView?: (product: Product) => void }> = ({ product, onQuickView }) => {
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const { t } = useI18n();
  const [isWishlisted, setIsWishlisted] = useState(wishlist.includes(product.id));

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await toggleWishlist(product.id);
    setIsWishlisted(res);
  };

  const handleCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetId = product.id || (product as any)._id;
    await addToCart(targetId, 1);
  };

  const catKey = `cat_${product.category.replace(/ /g, '_')}`;

  return (
    <div className="glass-card product-card-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Top Badges */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        {product.organic && (
          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '3px', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(17, 18, 24, 0.85)', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
            <Leaf size={12} /> {t('organic')}
          </span>
        )}

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(17, 18, 24, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: 'var(--text-primary)' }}
              title="Quick View Product"
            >
              <Eye size={17} />
            </button>
          )}

          <button
            type="button"
            onClick={handleWishlistClick}
            style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(17, 18, 24, 0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: isWishlisted ? '#FF4757' : '#9CA3AF' }}
            title="Wishlist Product"
          >
            <Heart size={18} fill={isWishlisted ? '#FF4757' : 'none'} />
          </button>
        </div>
      </div>

      {/* Product Image */}
      <Link to={`/products/${product.id}`} style={{ position: 'relative', width: '100%', paddingTop: '75%', overflow: 'hidden', display: 'block', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <img
          src={resolveProductImage(product.name, product.category, product.image, product.id)}
          alt={product.name}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = getCategoryFallbackSvg(product.name, product.category);
          }}
        />
      </Link>

      {/* Content */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          {/* Category & Rating */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(catKey) !== catKey ? t(catKey) : product.category}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontWeight: 700 }}>
              <Star size={14} fill="#f59e0b" />
              <span>{product.rating}</span>
              <span style={{ color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
            </div>
          </div>

          {/* Product Title */}
          <Link to={`/products/${product.id}`} style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'block', textDecoration: 'none' }}>
            {product.name}
          </Link>

          {/* Farmer Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            <MapPin size={13} style={{ color: 'var(--primary)' }} />
            <span>{t('by')} {product.farmerName} • {product.farmerDistrict}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <Calendar size={13} />
            <span>{t('harvested')} {product.harvestDate}</span>
          </div>
        </div>

        {/* Price & Action */}
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          {/* Wholesale vs Market Price Header */}
          {(() => {
            const { savingsAmount, savingsPercent } = calculateSavings(product.price, (product as any).marketPrice);
            const retailMarketPrice = (product as any).marketPrice && (product as any).marketPrice > product.price
              ? roundPrice((product as any).marketPrice)
              : roundPrice(product.price * 1.38);
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {t('retailMkt')} <span style={{ textDecoration: 'line-through', color: '#9CA3AF' }}>{formatCurrency(retailMarketPrice)}</span>
                  </div>
                  {savingsAmount > 0 && (
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                      {t('save')} {savingsPercent}% ({formatCurrency(savingsAmount)})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                      {formatCurrency(product.price)} <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('wholesale')}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('per')} {product.quantity} {product.unit}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCartClick}
                    disabled={product.stock <= 0}
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem' }}
                  >
                    <ShoppingCart size={15} /> {t('add')}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
