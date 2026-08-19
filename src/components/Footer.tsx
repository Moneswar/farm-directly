import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Phone, Mail, MapPin, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-secondary)', padding: '4rem 1.5rem 2rem', marginTop: '4rem', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}>
        {/* About FarmDirect */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ background: '#2ECC71', color: '#000000', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(46,204,113,0.3)' }}>
              <Sprout size={20} />
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem' }}>{t('appName')}</span>
          </div>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {t('aboutDesc')}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', background: 'rgba(46,204,113,0.15)', color: '#2ECC71', padding: '0.25rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(46,204,113,0.3)' }}>
              <ShieldCheck size={14} /> {t('fssaiCertified')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', background: 'rgba(59,130,246,0.15)', color: '#3498DB', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
              <HeartHandshake size={14} /> {t('fairTrade')}
            </span>
          </div>
        </div>

        {/* Quick Portals */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>{t('portalsHeader')}</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
            <li><Link to="/login?role=farmer" style={{ color: 'var(--text-secondary)' }}>🌾 {t('farmerPortal')}</Link></li>
            <li><Link to="/login?role=customer" style={{ color: 'var(--text-secondary)' }}>🛒 {t('customerPortal')}</Link></li>
            <li><Link to="/login?role=delivery" style={{ color: 'var(--text-secondary)' }}>🚚 {t('deliveryPortal')}</Link></li>
            <li><Link to="/login?role=admin" style={{ color: 'var(--text-secondary)' }}>🛡️ {t('adminPortal')}</Link></li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>{t('categoriesHeader')}</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
            <li><Link to="/?category=Vegetables" style={{ color: 'var(--text-secondary)' }}>{t('cat_Vegetables')}</Link></li>
            <li><Link to="/?category=Fruits" style={{ color: 'var(--text-secondary)' }}>{t('cat_Fruits')}</Link></li>
            <li><Link to="/?category=Honey" style={{ color: 'var(--text-secondary)' }}>{t('cat_Honey')}</Link></li>
            <li><Link to="/?category=Milk Products" style={{ color: 'var(--text-secondary)' }}>{t('cat_Milk_Products')}</Link></li>
            <li><Link to="/?category=Rice" style={{ color: 'var(--text-secondary)' }}>{t('cat_Rice')}</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>{t('contactHeader')}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} style={{ color: '#2ECC71' }} />
              <span>Pollachi Agro Hub, Coimbatore, TN - 641001</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={16} style={{ color: '#2ECC71' }} />
              <span>{t('tollFree')} 1800-425-FARM (3276)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} style={{ color: '#2ECC71' }} />
              <span>support@farmdirect.com</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '3rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} {t('allRightsReserved')}
      </div>
    </footer>
  );
};
