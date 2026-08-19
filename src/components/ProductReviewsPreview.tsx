import React from 'react';
import { Star, CheckCircle, Quote, ThumbsUp, ShieldCheck, Heart, Award } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';

interface Review {
  id: string;
  name: string;
  location: string;
  rating: number;
  productName: string;
  category: string;
  comment: string;
  date: string;
  likes: number;
  avatar: string;
}

const sampleReviews: Review[] = [
  {
    id: '1',
    name: 'Senthil Kumar',
    location: 'Coimbatore',
    rating: 5,
    productName: 'Desi A2 Cow Milk & Ghee',
    category: 'Milk Products',
    comment: 'Morning milk harvested at 5 AM reaches my doorstep by 8 AM. Pure aroma and zero water dilution. Best organic experience!',
    date: 'Yesterday',
    likes: 42,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    id: '2',
    name: 'Anitha Ramachandran',
    location: 'Chennai',
    rating: 5,
    productName: 'Mountain Raw Wild Honey',
    category: 'Honey',
    comment: 'Direct farmer pricing saved me over ₹400 compared to commercial organic brands. Authentic raw honey directly from Western Ghats!',
    date: '2 days ago',
    likes: 38,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    id: '3',
    name: 'Karthik Raja',
    location: 'Madurai',
    rating: 5,
    productName: 'Native Seeraga Samba Rice',
    category: 'Rice',
    comment: 'Unpolished native rice with incredible natural fragrance. Knowing 100% of my money goes directly to the farmer feels great.',
    date: '3 days ago',
    likes: 29,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
];

export const ProductReviewsPreview: React.FC = () => {
  const { t } = useI18n();

  return (
    <div
      className="glass-card"
      style={{
        padding: '2rem',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(59, 130, 246, 0.06) 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            <Award size={16} />
            <span>{t('overallRating')}</span>
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {t('productReviewsTitle')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {t('productReviewsSub')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card-solid)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', color: '#f59e0b' }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill="#f59e0b" />
            ))}
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>4.9 / 5</span>
        </div>
      </div>

      {/* Reviews Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {sampleReviews.map((rev) => (
          <div
            key={rev.id}
            style={{
              background: 'var(--bg-card-solid)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div>
              {/* User Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <img
                    src={rev.avatar}
                    alt={rev.name}
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{rev.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rev.location}</div>
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', gap: '3px' }}>
                  <CheckCircle size={11} /> {t('verifiedBuyer')}
                </span>
              </div>

              {/* Rating & Product Tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="#f59e0b" />
                  ))}
                </div>
                <span style={{ fontSize: '0.725rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
                  {rev.productName}
                </span>
              </div>

              {/* Review Text */}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem', fontStyle: 'italic' }}>
                "{rev.comment}"
              </p>
            </div>

            {/* Review Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{rev.date}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <ThumbsUp size={13} /> {rev.likes} Helpful
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Guarantee & Impact Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={18} style={{ color: '#2ECC71' }} />
          <span>100% Quality Inspected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Heart size={18} style={{ color: '#FF4757' }} />
          <span>Direct Farmer Profit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Star size={18} style={{ color: '#F59E0B' }} />
          <span>Top Rated Farm Produce</span>
        </div>
      </div>
    </div>
  );
};
