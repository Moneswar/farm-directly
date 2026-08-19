import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { VoiceSearch } from './components/VoiceSearch';
import { SupportChat } from './components/SupportChat';
import { CartDrawer } from './components/CartDrawer';

import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DeliveryDashboard } from './pages/DeliveryDashboard';
import { ShopkeeperDashboard } from './pages/ShopkeeperDashboard';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderHistory } from './pages/OrderHistory';
import { CustomerProfile } from './pages/CustomerProfile';
import { Wishlist } from './pages/Wishlist';
import { ProductDetails } from './pages/ProductDetails';
import { Documentation } from './pages/Documentation';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading authentication...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const targetRole = allowedRoles.includes('delivery')
      ? 'delivery'
      : allowedRoles.includes('farmer')
      ? 'farmer'
      : allowedRoles.includes('shopkeeper')
      ? 'shopkeeper'
      : allowedRoles.includes('admin')
      ? 'admin'
      : 'customer';
    return <Navigate to={`/login?role=${targetRole}`} replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { user, loading } = useAuth();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="badge badge-success" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', marginBottom: '1rem' }}>
            🌾 Loading FarmDirect...
          </div>
        </div>
      </div>
    );
  }

  // Default redirect path based on user role
  const getRoleRedirect = (role: string) => {
    if (role === 'farmer') return '/farmer/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'delivery') return '/delivery/dashboard';
    if (role === 'shopkeeper') return '/shopkeeper/dashboard';
    return '/';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenVoiceSearch={() => setVoiceOpen(true)} onOpenCartDrawer={() => setCartDrawerOpen(true)} />

      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes - Must be authenticated */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
          <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />

          {/* Customer Portal Alias Routes */}
          <Route path="/customer" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/customer/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/customer/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
          <Route path="/customer/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/customer/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />

          {/* Role-Specific Dashboards */}
          <Route path="/farmer/dashboard" element={<ProtectedRoute allowedRoles={['farmer', 'admin']}><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/delivery/dashboard" element={<ProtectedRoute allowedRoles={['delivery', 'admin']}><DeliveryDashboard /></ProtectedRoute>} />
          <Route path="/shopkeeper/dashboard" element={<ProtectedRoute allowedRoles={['shopkeeper', 'admin']}><ShopkeeperDashboard /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
        </Routes>
      </main>

      <Footer />

      {/* Voice Search Modal, Cart Drawer & Support Chat */}
      <VoiceSearch isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} onSearch={(q) => window.location.href = `/?search=${encodeURIComponent(q)}`} />
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      {user && <SupportChat />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

