import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectMongoDB } from '../backend/config/db.js';
import authRoutes from '../backend/routes/authRoutes.js';
import productRoutes from '../backend/routes/productRoutes.js';
import orderRoutes from '../backend/routes/orderRoutes.js';
import adminRoutes from '../backend/routes/adminRoutes.js';
import customerRoutes from '../backend/routes/customerRoutes.js';
import notificationRoutes from '../backend/routes/notificationRoutes.js';
import paymentRoutes from '../backend/routes/paymentRoutes.js';
import { getActiveHubs, getFarmerCollections, updateCollectionStatus, getDeliveryPayouts } from '../backend/controllers/hubController.js';
import { authenticateToken, requireRole } from '../backend/middlewares/auth.js';

const PORT = 3006;

function createTestServer(): Promise<http.Server> {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.get('/api/hubs/active', getActiveHubs);
  app.get('/api/collections', authenticateToken, requireRole(['farmer', 'admin']), getFarmerCollections);
  app.patch('/api/collections/:id/status', authenticateToken, requireRole(['farmer', 'delivery', 'admin']), updateCollectionStatus);
  app.get('/api/delivery/payouts', authenticateToken, requireRole(['delivery', 'admin']), getDeliveryPayouts);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'FarmDirect RBAC Engine', version: '1.0.0' });
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function request(path: string, options: { method?: string; body?: any; token?: string } = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${PORT}${path}`);
    const method = options.method || 'GET';
    const payload = options.body ? JSON.stringify(options.body) : undefined;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 0, data: parsed });
          } catch {
            resolve({ status: res.statusCode || 0, data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runRBACMatrixTest() {
  console.log('================================================================');
  console.log('🔐 FARMMARKET: COMPLETE AUTHENTICATION & RBAC PERMISSIONS TEST');
  console.log('================================================================\n');

  await connectMongoDB();
  const server = await createTestServer();

  try {
    // ---------------------------------------------------------
    // SUITE 1: AUTHENTICATION ROBUSTNESS & SECURITY
    // ---------------------------------------------------------
    console.log('--- 1. Authentication Security & Input Validation ---');

    // 1.1 Unauthenticated access to protected route
    const unauthRes = await request('/api/auth/profile');
    assert(unauthRes.status === 401, 'Access without token rejected with 401 Unauthorized');

    // 1.2 Access with malformed token
    const malformedRes = await request('/api/auth/profile', { token: 'invalid_malformed_token_xyz' });
    assert(malformedRes.status === 403, 'Access with malformed token rejected with 403 Forbidden');

    // 1.3 Access with modified signature JWT
    const tamperedRes = await request('/api/auth/profile', {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzcl9hZG1pbiIsInJvbGUiOiJhZG1pbiJ9.tampered_signature_string',
    });
    assert(tamperedRes.status === 403, 'Access with tampered signature rejected with 403 Forbidden');

    // 1.4 Login with wrong password
    const wrongPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.com', password: 'incorrect_password_123', role: 'customer' },
    });
    assert((wrongPassRes.status === 400 || wrongPassRes.status === 401) && !wrongPassRes.data.success, 'Login with wrong password rejected');

    // 1.5 Login with non-existing email
    const nonExistRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent_ghost_user@farmdirect.com', password: 'password123', role: 'customer' },
    });
    assert((nonExistRes.status === 401 || nonExistRes.status === 400 || nonExistRes.status === 404) && !nonExistRes.data.success, 'Login with non-existing email rejected with 401');

    // 1.6 Login with empty fields
    const emptyLoginRes = await request('/api/auth/login', { method: 'POST', body: {} });
    assert(emptyLoginRes.status === 400 && !emptyLoginRes.data.success, 'Empty login body rejected with 400 Bad Request');

    // 1.7 Register with duplicate email
    const dupRegRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Test',
        email: 'customer@farmdirect.com',
        password: 'password123',
        phone: '9876543210',
        role: 'customer',
      },
    });
    assert((dupRegRes.status === 400 || dupRegRes.status === 409) && !dupRegRes.data.success, 'Duplicate registration rejected with 400/409');

    // ---------------------------------------------------------
    // SUITE 2: MULTI-ROLE AUTHENTICATION
    // ---------------------------------------------------------
    console.log('\n--- 2. Multi-Role Successful Logins ---');

    // Customer
    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.com', password: 'customerpassword123', role: 'customer' },
    });
    assert(custLogin.status === 200 && custLogin.data.success, 'Customer login succeeded (200)');
    const custToken = custLogin.data.token;
    assert(custLogin.data.user.role === 'customer', 'Customer user role verified');

    // Farmer
    const farmerLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'farmer@farmdirect.com', password: 'farmerpassword123', role: 'farmer' },
    });
    assert(farmerLogin.status === 200 && farmerLogin.data.success, 'Farmer login succeeded (200)');
    const farmerToken = farmerLogin.data.token;
    assert(farmerLogin.data.user.role === 'farmer', 'Farmer user role verified');

    // Admin
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
    });
    assert(adminLogin.status === 200 && adminLogin.data.success, 'Admin login succeeded (200)');
    const adminToken = adminLogin.data.token;
    assert(adminLogin.data.user.role === 'admin', 'Admin user role verified');

    // Delivery
    const deliveryLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'delivery@farmdirect.com', password: 'deliverypassword123', role: 'delivery' },
    });
    assert(deliveryLogin.status === 200 && deliveryLogin.data.success, 'Delivery Partner login succeeded (200)');
    const deliveryToken = deliveryLogin.data.token;
    assert(deliveryLogin.data.user.role === 'delivery', 'Delivery Partner user role verified');

    // Shopkeeper
    const shopLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'shopkeeper@farmdirect.com', password: 'customerpassword123', role: 'shopkeeper' },
    });
    assert(shopLogin.status === 200 && shopLogin.data.success, 'Shopkeeper login succeeded (200)');
    const shopToken = shopLogin.data.token;
    assert(shopLogin.data.user.role === 'shopkeeper', 'Shopkeeper user role verified');

    // ---------------------------------------------------------
    // SUITE 3: CUSTOMER ROLE ISOLATION & PERMISSIONS
    // ---------------------------------------------------------
    console.log('\n--- 3. Customer Role Permissions & Protection ---');

    // Authorized customer operations
    const custProfile = await request('/api/auth/profile', { token: custToken });
    assert(custProfile.status === 200 && custProfile.data.success, 'Customer retrieved their own profile (200)');

    const custCart = await request('/api/customer/cart', { token: custToken });
    assert(custCart.status === 200 && custCart.data.success, 'Customer accessed their shopping cart (200)');

    const custOrders = await request('/api/orders', { token: custToken });
    assert(custOrders.status === 200 && custOrders.data.success, 'Customer retrieved their order history (200)');

    // UNAUTHORIZED attempts by Customer
    const custAdmin1 = await request('/api/admin/analytics', { token: custToken });
    assert(custAdmin1.status === 403, 'Customer blocked from GET /admin/analytics (403 Forbidden)');

    const custAdmin2 = await request('/api/admin/users', { token: custToken });
    assert(custAdmin2.status === 403, 'Customer blocked from GET /admin/users (403 Forbidden)');

    const custFarmerApi = await request('/api/products/my-products', { token: custToken });
    assert(custFarmerApi.status === 403, 'Customer blocked from Farmer /products/my-products (403 Forbidden)');

    const custCreateProd = await request('/api/products', {
      method: 'POST',
      token: custToken,
      body: { name: 'Fake Product', price: 100, category: 'Fruits', unit: 'Kg', stock: 10 },
    });
    assert(custCreateProd.status === 403, 'Customer blocked from POST /products create (403 Forbidden)');

    const custDeliveryApi = await request('/api/delivery/payouts', { token: custToken });
    assert(custDeliveryApi.status === 403, 'Customer blocked from GET /delivery/payouts (403 Forbidden)');

    // ---------------------------------------------------------
    // SUITE 4: FARMER ROLE ISOLATION & IDOR PROTECTION
    // ---------------------------------------------------------
    console.log('\n--- 4. Farmer Role Permissions & IDOR Security ---');

    // Authorized farmer operations
    const farmerProds = await request('/api/products/my-products', { token: farmerToken });
    assert(farmerProds.status === 200 && farmerProds.data.success, 'Farmer retrieved their produce inventory (200)');

    // Farmer adds produce item
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newProdRes = await request('/api/products', {
      method: 'POST',
      token: farmerToken,
      body: {
        name: `Fresh Farm Organic Beetroot ${randomSuffix}`,
        category: 'Vegetables',
        price: 45,
        unit: 'Kg',
        stock: 80,
        organic: true,
        harvestDate: '2026-08-19',
      },
    });
    assert(newProdRes.status === 201 && newProdRes.data.success, 'Farmer uploaded new produce item (201 Created)');
    const createdProdId = newProdRes.data.product.id;

    // Farmer updates own produce item
    const updateOwnProd = await request(`/api/products/${createdProdId}`, {
      method: 'PUT',
      token: farmerToken,
      body: { price: 50, stock: 100 },
    });
    assert(updateOwnProd.status === 200 && updateOwnProd.data.success, 'Farmer updated their own product (200)');

    // IDOR TEST: Customer attempting to edit or delete farmer's produce item
    const idorEdit = await request(`/api/products/${createdProdId}`, {
      method: 'PUT',
      token: custToken,
      body: { price: 1 },
    });
    assert(idorEdit.status === 403, 'Customer blocked from modifying Farmer product (403 IDOR protected)');

    const idorDelete = await request(`/api/products/${createdProdId}`, {
      method: 'DELETE',
      token: custToken,
    });
    assert(idorDelete.status === 403, 'Customer blocked from deleting Farmer product (403 IDOR protected)');

    // UNAUTHORIZED attempts by Farmer
    const farmerAdmin = await request('/api/admin/analytics', { token: farmerToken });
    assert(farmerAdmin.status === 403, 'Farmer blocked from Admin analytics (403 Forbidden)');

    const farmerCoupon = await request('/api/admin/coupons', {
      method: 'POST',
      token: farmerToken,
      body: { code: 'HACK50', discountPercentage: 50, maxDiscount: 500, minOrderAmount: 100, validUntil: '2026-12-31' },
    });
    assert(farmerCoupon.status === 403, 'Farmer blocked from creating Admin coupons (403 Forbidden)');

    // ---------------------------------------------------------
    // SUITE 5: DELIVERY PARTNER ROLE ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- 5. Delivery Partner Permissions & Isolation ---');

    // Authorized delivery operations
    const delivOrders = await request('/api/orders', { token: deliveryToken });
    assert(delivOrders.status === 200 && delivOrders.data.success, 'Delivery partner retrieved delivery orders feed (200)');

    const delivPayouts = await request('/api/delivery/payouts', { token: deliveryToken });
    assert(delivPayouts.status === 200 && delivPayouts.data.success, 'Delivery partner retrieved earnings/payout history (200)');

    // UNAUTHORIZED attempts by Delivery Partner
    const delivAdmin = await request('/api/admin/analytics', { token: deliveryToken });
    assert(delivAdmin.status === 403, 'Delivery partner blocked from Admin analytics (403 Forbidden)');

    const delivProdCreate = await request('/api/products', {
      method: 'POST',
      token: deliveryToken,
      body: { name: 'Fake Produce', price: 10, category: 'Vegetables', unit: 'Kg', stock: 10 },
    });
    assert(delivProdCreate.status === 403, 'Delivery partner blocked from creating products (403 Forbidden)');

    // ---------------------------------------------------------
    // SUITE 6: ADMIN SUPER-ADMIN ROLE
    // ---------------------------------------------------------
    console.log('\n--- 6. Admin Role Operations & Approvals ---');

    const adminStats = await request('/api/admin/analytics', { token: adminToken });
    assert(adminStats.status === 200 && adminStats.data.success, 'Admin accessed system-wide analytics (200)');

    const adminUsers = await request('/api/admin/users', { token: adminToken });
    assert(adminUsers.status === 200 && adminUsers.data.success, 'Admin accessed user management directory (200)');

    const adminApprove = await request(`/api/products/${createdProdId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'Approved' },
    });
    assert(adminApprove.status === 200 && adminApprove.data.success, 'Admin approved farmer produce item (200)');

    // Clean up test produce
    await request(`/api/products/${createdProdId}`, { method: 'DELETE', token: adminToken });

    console.log('\n================================================================');
    console.log('🎉 ALL USER, AUTHENTICATION & ROLE-PERMISSION TESTS PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runRBACMatrixTest().catch((err) => {
  console.error('RBAC Matrix test failed:', err);
  process.exit(1);
});
