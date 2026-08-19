import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sprout, Leaf, Sparkles, Filter, ArrowUpDown, Tractor, ShieldCheck, Truck, ArrowRight, Zap } from 'lucide-react';
import { apiFetch } from '../services/api';
import { ProductCard, Product } from '../components/ProductCard';
import { ProductPreviewCarousel } from '../components/ProductPreviewCarousel';
import { DealCountdown } from '../components/DealCountdown';
import { ProductQuickView } from '../components/ProductQuickView';
import { useI18n } from '../context/LanguageContext';

const categories = [
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Grains',
  'Pulses',
  'Spices',
  'Nuts & Dry Fruits',
  'Seeds',
  'Flowers',
  'Dairy',
];

export const Home: React.FC = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>(() => searchParams.get('category') || 'Fruits');
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') || '');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Sync if URL search parameters change externally (e.g. from top Navbar search)
  useEffect(() => {
    const urlCat = searchParams.get('category');
    const urlSearch = searchParams.get('search');
    if (urlCat) setSelectedCategory(urlCat);
    if (urlSearch !== null) setSearchQuery(urlSearch);
  }, [searchParams]);

  useEffect(() => {
    let isSubscribed = true;
    async function fetchProducts() {
      try {
        setLoading(true);
        let url = `/products?status=Approved&sortBy=${sortBy}`;
        if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (organicOnly) url += `&organic=true`;

        const res = await apiFetch(url);
        if (res.success && isSubscribed) {
          setProducts(res.products || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }
    fetchProducts();
    return () => {
      isSubscribed = false;
    };
  }, [selectedCategory, searchQuery, organicOnly, sortBy]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Hero Banner Section */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, #111218 0%, #0D0E14 100%)',
          color: '#ffffff',
          padding: '3.5rem 2.5rem',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '680px' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(46, 204, 113, 0.15)', color: '#2ECC71', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '0.4rem 0.9rem', borderRadius: '999px', fontSize: '0.825rem', fontWeight: 700 }}>
              <Sparkles size={16} /> {t('heroBadge1')}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.4rem 0.9rem', borderRadius: '999px', fontSize: '0.825rem', fontWeight: 800 }}>
              {t('heroBadge2')}
            </div>
          </div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {t('heroTitlePre')}<span style={{ color: '#2ECC71' }}>{t('heroTitleHighlight')}</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#9CA3AF', lineHeight: 1.6, marginBottom: '2rem' }}>
            {t('heroDesc')}
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: 'var(--radius-pill)' }}
            >
              {t('exploreHarvest')} <ArrowRight size={18} />
            </button>
            <Link to="/register?role=farmer" className="btn btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: 'var(--radius-pill)', color: '#ffffff', borderColor: 'rgba(46, 204, 113, 0.4)' }}>
              <Tractor size={18} /> {t('registerAsFarmer')}
            </Link>
          </div>
        </div>

        {/* Feature Highlights Overlay */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={28} style={{ color: '#2ECC71' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('fssaiTested')}</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{t('verifiedSoil')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Truck size={28} style={{ color: '#3498DB' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('sameDayExpress')}</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{t('directFarmPickup')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={28} style={{ color: '#E67E22' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('fairFarmerPay')}</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{t('earningsToFarmer')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Flash Harvest Urgency Bar */}
      <DealCountdown />

      {/* Featured Farm Produce Interactive Preview Carousel */}
      <div style={{ marginBottom: '2.5rem' }}>
        <ProductPreviewCarousel />
      </div>

      {/* Categories Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t('browseCategories')}</h2>
          {(selectedCategory !== 'Fruits' || searchQuery || organicOnly) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedCategory('Fruits');
                setSearchQuery('');
                setOrganicOnly(false);
              }}
              style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}
            >
              {t('resetFilters')}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const catKey = `cat_${cat.replace(/ /g, '_')}`;
            return (
              <button
                type="button"
                key={cat}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedCategory(cat);
                }}
                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap', padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}
              >
                {cat === 'Organic Products' && <Leaf size={14} />}
                {t(catKey) !== catKey ? t(catKey) : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Section Header & Controls */}
      <div id="products-section" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {t(`cat_${selectedCategory.replace(/ /g, '_')}`) !== `cat_${selectedCategory.replace(/ /g, '_')}`
              ? t(`cat_${selectedCategory.replace(/ /g, '_')}`)
              : selectedCategory}
            {searchQuery && ` ("${searchQuery}")`}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing {products.length} fresh products directly from verified local growers</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={organicOnly}
              onChange={(e) => setOrganicOnly(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            {t('organicOnly')}
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowUpDown size={16} style={{ color: 'var(--text-muted)' }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <option value="newest">{t('sortBy')} {t('newest')}</option>
              <option value="price-low">{t('priceLowHigh')}</option>
              <option value="price-high">{t('priceHighLow')}</option>
              <option value="rating">{t('highestRated')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid Container with Preserved Height */}
      <div style={{ position: 'relative', minHeight: '400px' }}>
        {loading && products.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(10, 11, 13, 0.35)',
              backdropFilter: 'blur(3px)',
              zIndex: 30,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)',
              pointerEvents: 'none',
            }}
          >
            <Sprout size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Updating fresh produce...</span>
          </div>
        )}

        {products.length === 0 && loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Sprout size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <div>Fetching fresh farm produce...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Sprout size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>{t('noProductsFound')}</h3>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setSelectedCategory('Fruits');
                setOrganicOnly(false);
                setSearchQuery('');
              }}
              className="btn btn-primary"
            >
              {t('resetFilters')}
            </button>
          </div>
        ) : (
          <div className="grid-4" style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s ease' }}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        )}
      </div>

      {/* Product Quick View Modal */}
      <ProductQuickView product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
};
