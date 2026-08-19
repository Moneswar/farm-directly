import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectMongoDB } from '../backend/config/db.js';
import { Product } from '../backend/models/Product.js';
import { User } from '../backend/models/User.js';
import authRoutes from '../backend/routes/authRoutes.js';
import productRoutes from '../backend/routes/productRoutes.js';
import orderRoutes from '../backend/routes/orderRoutes.js';
import adminRoutes from '../backend/routes/adminRoutes.js';
import customerRoutes from '../backend/routes/customerRoutes.js';
import notificationRoutes from '../backend/routes/notificationRoutes.js';
import paymentRoutes from '../backend/routes/paymentRoutes.js';
import { getActiveHubs, getFarmerCollections, updateCollectionStatus, getDeliveryPayouts } from '../backend/controllers/hubController.js';
import { authenticateToken, requireRole } from '../backend/middlewares/auth.js';

const PORT = 3009;

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
    res.json({ status: 'ok', name: 'FarmDirect Security Engine', version: '1.0.0' });
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function request(path: string, options: { method?: string; body?: any; token?: string } = {}): Promise<{ status: number; data: any; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
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
          const durationMs = Date.now() - startTime;
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 0, data: parsed, durationMs });
          } catch {
            resolve({ status: res.statusCode || 0, data, durationMs });
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

async function runSecurityPerformanceAudit() {
  console.log('================================================================');
  console.log('🛡️ FARMMARKET: COMPLETE SECURITY, PERFORMANCE & QUALITY AUDIT');
  console.log('================================================================\n');

  await connectMongoDB();
  const server = await createTestServer();

  try {
    // ---------------------------------------------------------
    // 1. SECURITY & RBAC PERMISSION GUARDS
    // ---------------------------------------------------------
    console.log('--- 1. Authentication & RBAC Boundary Security ---');
    
    // Test Customer Login
    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.com', password: 'customerpassword123', role: 'customer' },
    });
    const custToken = custLogin.data.token;
    assert(!!custToken, 'JWT token issued upon customer login');

    // Token Expiration & Tamper rejection
    const tamperedRes = await request('/api/auth/profile', { token: custToken + 'invalid_signature_bits' });
    assert(tamperedRes.status === 403, 'Tampered token rejected with 403 Forbidden');

    // Customer RBAC boundary
    const custToAdmin = await request('/api/admin/analytics', { token: custToken });
    assert(custToAdmin.status === 403, 'Customer blocked from Admin analytics (403 Forbidden)');

    const custToFarmer = await request('/api/products/my-products', { token: custToken });
    assert(custToFarmer.status === 403, 'Customer blocked from Farmer produce management (403 Forbidden)');

    const custToDelivery = await request('/api/delivery/payouts', { token: custToken });
    assert(custToDelivery.status === 403, 'Customer blocked from Delivery payouts (403 Forbidden)');

    // ---------------------------------------------------------
    // 2. PASSWORD SECURITY & DATA EXPOSURE AUDIT
    // ---------------------------------------------------------
    console.log('\n--- 2. Password Security & Sensitive Data Leakage Audit ---');
    const usersInDb = await User.find({}).lean();
    let plaintextCount = 0;
    for (const u of usersInDb) {
      if (!u.passwordHash || !u.passwordHash.startsWith('$2')) {
        plaintextCount++;
      }
    }
    assert(plaintextCount === 0, '100% of stored user passwords are encrypted with bcrypt hashes');

    // Check that admin user directory NEVER returns plaintext password
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
    });
    const adminToken = adminLogin.data.token;

    const userListRes = await request('/api/admin/users', { token: adminToken });
    assert(userListRes.status === 200 && userListRes.data.success, 'Admin user list retrieved (200)');
    const exposedPlaintext = (userListRes.data.users || []).some((u: any) => u.password && !u.password.startsWith('$2'));
    assert(!exposedPlaintext, 'Zero plaintext passwords exposed in API responses');

    // ---------------------------------------------------------
    // 3. API QUERY PERFORMANCE & LATENCY
    // ---------------------------------------------------------
    console.log('\n--- 3. API Query Performance & Response Latency ---');
    const catalogLatency = await request('/api/products?status=Approved');
    assert(catalogLatency.status === 200, `Catalog loaded in ${catalogLatency.durationMs}ms`);

    const categoryLatency = await request('/api/products?category=Fruits&status=Approved');
    assert(categoryLatency.status === 200, `Fruits category query executed in ${categoryLatency.durationMs}ms`);

    const searchLatency = await request('/api/products?search=Tomato');
    assert(searchLatency.status === 200, `Product search executed in ${searchLatency.durationMs}ms`);

    // ---------------------------------------------------------
    // 4. DATABASE INDEXES VERIFICATION
    // ---------------------------------------------------------
    console.log('\n--- 4. Database Indexing & Performance ---');
    const productIndexes = await Product.collection.getIndexes();
    console.log('  Product Collection Indexes:', Object.keys(productIndexes).join(', '));
    assert(!!productIndexes['id_1'], 'Unique index on product.id exists');
    assert(!!productIndexes['farmerId_1'], 'Index on product.farmerId exists');
    assert(!!productIndexes['category_1_status_1'], 'Compound index on product(category, status) exists');

    const userIndexes = await User.collection.getIndexes();
    console.log('  User Collection Indexes:', Object.keys(userIndexes).join(', '));
    assert(!!userIndexes['id_1'], 'Unique index on user.id exists');
    assert(!!userIndexes['email_1'], 'Unique index on user.email exists');
    assert(!!userIndexes['role_1'], 'Index on user.role exists');

    // ---------------------------------------------------------
    // 5. RESTART IDEMPOTENCY
    // ---------------------------------------------------------
    console.log('\n--- 5. Database Startup Idempotency ---');
    const count1 = await Product.countDocuments();
    await connectMongoDB();
    await connectMongoDB();
    const count2 = await Product.countDocuments();
    assert(count1 === count2, 'Product initialization is 100% IDEMPOTENT (Zero duplicates created)');

    console.log('\n================================================================');
    console.log('🎉 COMPLETE SECURITY, PERFORMANCE & QUALITY AUDIT PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runSecurityPerformanceAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
