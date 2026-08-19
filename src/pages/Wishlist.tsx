import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sprout, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/LanguageContext';
import { apiFetch } from '../services/api';
import { ProductCard, Product } from '../components/ProductCard';

export const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { wishlist } = useCart();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlist() {
      try {
        setLoading(true);
        const res = await apiFetch('/products?status=Approved');
        if (res.success) {
          const matched = res.products.filter((p: Product) => wishlist.includes(p.id));
          setWishlistProducts(matched);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadWishlist();
  }, [wishlist]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>

      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
        <Heart size={26} style={{ color: '#ef4444' }} /> Saved Wishlist Items ({wishlistProducts.length})
      </h2>

      {wishlistProducts.length === 0 ? (
        <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <Heart size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>Your wishlist is empty</h3>
          <p style={{ color: 'var(--text-muted)' }}>Click the heart icon on any farm produce to save it for later.</p>
        </div>
      ) : (
        <div className="grid-4">
          {wishlistProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};
