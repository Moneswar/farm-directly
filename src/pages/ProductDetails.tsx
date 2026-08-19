import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Leaf, MapPin, Calendar, Heart, User, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { resolveProductImage, getCategoryFallbackSvg } from '../utils/productImages';
import { formatCurrency, roundPrice, calculateSavings } from '../utils/currency';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { addToCart, toggleWishlist, wishlist } = useCart();

  const [product, setProduct] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/products/${id}`);
        setProduct(res.product || res);
        setReviews(res.reviews || []);
        setIsWishlisted(wishlist.includes(res.product?.id || id));
      } catch (e) {
        console.error('Failed to fetch product:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, wishlist]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Product not found</h2>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Products</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
        {/* Image Column */}
        <div className="glass-card" style={{ padding: '1rem', position: 'relative', overflow: 'hidden' }}>
          <img
            src={resolveProductImage(product.name, product.category, product.image, product.id)}
            alt={product.name}
            style={{ width: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover', maxHeight: '420px' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getCategoryFallbackSvg(product.name, product.category);
            }}
          />
          {product.organic && (
            <span className="badge badge-success" style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(17, 18, 24, 0.85)' }}>
              <Leaf size={14} /> {t('organic')}
            </span>
          )}
        </div>

        {/* Details Column */}
        <div>
          <span className="badge badge-info" style={{ textTransform: 'uppercase', marginBottom: '0.5rem' }}>{product.category}</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.4rem 0' }}>{product.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, marginBottom: '1rem' }}>
            <Star size={18} fill="#f59e0b" />
            <span>{product.rating} / 5</span>
            <span style={{ color: 'var(--text-muted)' }}>({product.reviewsCount} Customer Reviews)</span>
          </div>

          {/* Wholesale Price Comparison Box */}
          {(() => {
            const { savingsAmount, savingsPercent } = calculateSavings(product.price, (product as any).marketPrice);
            const retailMktPrice = (product as any).marketPrice && (product as any).marketPrice > product.price
              ? roundPrice((product as any).marketPrice)
              : roundPrice(product.price * 1.38);
            return (
              <div style={{ background: 'var(--primary-light)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span className="badge badge-success" style={{ fontWeight: 800 }}>🏷️ FarmDirect Wholesale Rate</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Local Retail Market: <span style={{ textDecoration: 'line-through', fontWeight: 600 }}>{formatCurrency(retailMktPrice)}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--primary)' }}>
                    {formatCurrency(product.price)}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    per {product.quantity} {product.unit}
                  </div>
                  {savingsAmount > 0 && (
                    <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', fontWeight: 800 }}>
                      🎉 Save {savingsPercent}% ({formatCurrency(savingsAmount)}/{product.unit})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--primary)', marginTop: '0.4rem', fontWeight: 600 }}>
                  ⚡ You get wholesale pricing direct from {product.farmerName}'s farm (Zero Middlemen Markup)
                </div>
              </div>
            );
          })()}

          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{product.description}</p>

          {/* Transparent Price Information Box */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
            <div style={{ fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>💡 Price Information</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px' }}>
              <span>Farmer Original Price:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(product.farmerPrice || roundPrice(product.price * 0.7))} / {product.unit}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px' }}>
              <span>Farm-to-Hub Logistics:</span>
              <span style={{ color: '#2ECC71', fontWeight: 600 }}>Included</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px' }}>
              <span>Platform Service & Quality Assurance:</span>
              <span style={{ color: '#3498DB', fontWeight: 600 }}>Included</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)', fontWeight: 800 }}>
              <span>Customer Selling Price:</span>
              <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{formatCurrency(product.price)} / {product.unit}</strong>
            </div>
          </div>

          {/* Farmer Info Box */}
          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} style={{ color: 'var(--primary)' }} /> Cultivated by: {product.farmerName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Farm Location: {product.farmerDistrict}, {product.location}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Harvest Date: {product.harvestDate}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input type="number" min="1" max={product.stock} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="form-input" style={{ width: '80px', textAlign: 'center' }} />
            <button onClick={() => addToCart(product.id, qty)} className="btn btn-primary" style={{ flex: 1, borderRadius: 'var(--radius-pill)', gap: '0.5rem' }}>
              <ShoppingCart size={18} /> Add {qty} {product.unit} to Cart
            </button>
            <button onClick={() => toggleWishlist(product.id)} className="btn btn-secondary" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, color: isWishlisted ? '#ef4444' : 'var(--text-muted)' }}>
              <Heart size={20} fill={isWishlisted ? '#ef4444' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>Customer Reviews ({reviews.length})</h3>

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No reviews yet for this farm product.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div key={rev.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={16} /> {rev.userName || rev.customerName || 'Customer'}
                  </div>
                  <div style={{ display: 'flex', color: '#f59e0b' }}>
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="#f59e0b" />
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{rev.comment}</p>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{new Date(rev.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
