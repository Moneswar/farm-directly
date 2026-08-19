import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Terminal, Database, Shield, ArrowLeft } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';

export const Documentation: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'api' | 'install' | 'db'>('api');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BookOpen size={36} style={{ color: '#10b981' }} />
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>FarmDirect Project Documentation</h1>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Architecture, API Spec, Database Schemas, and Setup Instructions</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('api')} className={`btn ${activeTab === 'api' ? 'btn-primary' : 'btn-secondary'}`}>
          <Terminal size={18} /> API Documentation
        </button>
        <button onClick={() => setActiveTab('install')} className={`btn ${activeTab === 'install' ? 'btn-primary' : 'btn-secondary'}`}>
          <BookOpen size={18} /> Installation Guide
        </button>
        <button onClick={() => setActiveTab('db')} className={`btn ${activeTab === 'db' ? 'btn-primary' : 'btn-secondary'}`}>
          <Database size={18} /> Database Schemas
        </button>
      </div>

      {activeTab === 'api' && (
        <div className="glass-card" style={{ padding: '2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>REST API Reference</h2>
          <h3>Auth Routes (/api/auth)</h3>
          <ul>
            <li><code>POST /api/auth/register</code> - Register Customer, Farmer, Delivery, or Admin</li>
            <li><code>POST /api/auth/login</code> - Authenticate & return JWT token</li>
            <li><code>GET /api/auth/me</code> - Retrieve logged in user profile</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem' }}>Product Routes (/api/products)</h3>
          <ul>
            <li><code>GET /api/products</code> - List approved products with filtering/sorting</li>
            <li><code>POST /api/products/create</code> - Farmer produce submission</li>
            <li><code>PATCH /api/products/:id/approval</code> - Admin approve/reject produce</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem' }}>Order Routes (/api/orders)</h3>
          <ul>
            <li><code>POST /api/orders/create</code> - Checkout cart & create order</li>
            <li><code>GET /api/orders</code> - Get user role filtered orders</li>
            <li><code>PATCH /api/orders/:id/status</code> - Update status (Pickup, Out for delivery, Delivered)</li>
          </ul>
        </div>
      )}

      {activeTab === 'install' && (
        <div className="glass-card" style={{ padding: '2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Installation & Execution Guide</h2>
          <pre style={{ background: 'var(--bg-sidebar)', color: '#34d399', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
{`1. Clone the repository
2. Install npm dependencies:
   npm install

3. Environment Variables (.env):
   PORT=3000
   JWT_SECRET=farmdirect_jwt_secret_2026_key

4. Run Development Full-Stack App:
   npm run dev

5. Build for Production:
   npm run build
   npm start`}
          </pre>
        </div>
      )}

      {activeTab === 'db' && (
        <div className="glass-card" style={{ padding: '2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>MongoDB / Mongoose Collections</h2>
          <ul>
            <li><strong>User:</strong> id, name, email, passwordHash, role, phone, address, state, district, pincode, status, walletBalance, loyaltyPoints</li>
            <li><strong>Product:</strong> id, name, category, price, quantity, unit, organic, image, farmerId, status, stock, rating</li>
            <li><strong>Order:</strong> id, customerId, items, deliveryAddress, paymentMethod, orderStatus, grandTotal, deliveryOtp</li>
          </ul>
        </div>
      )}
    </div>
  );
};
