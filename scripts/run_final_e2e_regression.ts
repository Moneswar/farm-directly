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

const PORT = 3010;

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
    res.json({ status: 'ok', name: 'FarmDirect Final E2E Engine', version: '1.0.0' });
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

async function runFinalE2ERegression() {
  console.log('================================================================');
  console.log('🚀 FARMMARKET: FINAL FULL END-TO-END REGRESSION TEST SUITE');
  console.log('================================================================\n');

  // 1. CLEAN START & DATABASE CONNECTION
  console.log('--- 1. Clean Start & MongoDB Connection ---');
  await connectMongoDB();
  assert(mongoose.connection.readyState === 1, 'MongoDB connection state is 1 (Connected)');
  console.log(`  Connected Database: ${mongoose.connection.db?.databaseName}`);

  const server = await createTestServer();

  try {
    // 2. AUTHENTICATION & REGISTRATION
    console.log('\n--- 2. Customer Authentication & Registration ---');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const registerRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: `Final Test Customer ${randSuffix}`,
        email: `final_cust_${randSuffix}@farmdirect.com`,
        password: 'password123',
        phone: '9876543210',
        role: 'customer',
        district: 'Coimbatore',
        pincode: '641001',
      },
    });
    assert(registerRes.status === 201 && registerRes.data.success, 'New customer registered successfully (201)');
    const custToken = registerRes.data.token;
    const custId = registerRes.data.user.id;
    assert(!!custToken, 'JWT received upon customer registration');

    // Customer Login Verification
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: `final_cust_${randSuffix}@farmdirect.com`, password: 'password123', role: 'customer' },
    });
    assert(loginRes.status === 200 && loginRes.data.success, 'Customer logged in successfully (200)');

    // 3. CATEGORY TEST & "ALL" CATEGORY ABSENCE VERIFICATION
    console.log('\n--- 3. Category Filtering (All 10 Categories Tested) ---');
    const standardCategories = [
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

    for (const cat of standardCategories) {
      const catRes = await request(`/api/products?category=${encodeURIComponent(cat)}&status=Approved`);
      assert(catRes.status === 200, `Category "${cat}" query returned 200 OK (${catRes.data.products.length} items)`);
      const wrongItems = catRes.data.products.filter((p: any) => p.category !== cat);
      assert(wrongItems.length === 0, `Zero cross-category items in "${cat}"`);
      const coconutItems = catRes.data.products.filter((p: any) => p.name.toLowerCase().includes('coconut'));
      assert(coconutItems.length === 0, `Zero coconut items in "${cat}"`);
    }

    // 4. COCONUT FINAL SCAN
    console.log('\n--- 4. Coconut Elimination Final Verification ---');
    const coconutSearch = await request('/api/products?search=coconut');
    assert(coconutSearch.data.products.length === 0, 'Search for "coconut" returns 0 products');
    const freshCoconutSearch = await request('/api/products?search=Fresh+Farm+Coconut');
    assert(freshCoconutSearch.data.products.length === 0, 'Search for "Fresh Farm Coconut" returns 0 products');
    const dbCoconuts = await Product.find({ name: { $regex: /coconut/i } }).lean();
    assert(dbCoconuts.length === 0, `MongoDB contains exactly 0 coconut records (${dbCoconuts.length} found)`);

    // 5. SEARCH TEST
    console.log('\n--- 5. Product Search Test ---');
    const exactSearch = await request('/api/products?search=Apple');
    assert(exactSearch.data.products.some((p: any) => p.name.toLowerCase() === 'apple'), 'Exact search for "Apple" returned Apple');

    const partialSearch = await request('/api/products?search=Tom');
    assert(partialSearch.data.products.some((p: any) => p.name.toLowerCase().includes('tomato')), 'Partial search for "Tom" returned Tomato');

    const caseSearch = await request('/api/products?search=bAnAnA');
    assert(caseSearch.data.products.some((p: any) => p.name.toLowerCase().includes('banana')), 'Case-insensitive search for "bAnAnA" returned Banana');

    const nonexistentSearch = await request('/api/products?search=non_existent_produce_xyz');
    assert(nonexistentSearch.data.products.length === 0, 'Nonexistent search gracefully returned 0 products');

    // 6. CART & CHECKOUT TEST
    console.log('\n--- 6. Cart & Checkout Operations ---');
    const addCartRes = await request('/api/customer/cart/add', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_vegetables_tomato', quantity: 2 },
    });
    assert(addCartRes.status === 200 && addCartRes.data.success, 'Added 2 Tomato to cart');

    const updateCartRes = await request('/api/customer/cart/update', {
      method: 'PUT',
      token: custToken,
      body: { productId: 'prod_vegetables_tomato', quantity: 3 },
    });
    assert(updateCartRes.status === 200 && updateCartRes.data.success, 'Updated cart quantity to 3 Tomato');

    const removeCartRes = await request('/api/customer/cart/update', {
      method: 'PUT',
      token: custToken,
      body: { productId: 'prod_vegetables_tomato', quantity: 0 },
    });
    assert(removeCartRes.status === 200 && removeCartRes.data.success, 'Removed Tomato from cart (quantity: 0)');

    // 7. ORDER CREATION & INVENTORY DEDUCTION
    console.log('\n--- 7. Order Placement & Inventory Deduction ---');
    const tomatoDocBefore = await Product.findOne({ id: 'prod_vegetables_tomato' }).lean();
    const tomatoStockBefore = (tomatoDocBefore as any)?.stock || 100;

    const createOrderRes = await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod_vegetables_tomato', quantity: 2 }],
        deliveryAddress: {
          street: '20 Avinashi Road',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641004',
        },
        deliveryMethod: 'home_delivery',
        paymentMethod: 'COD',
        useWallet: false,
      },
    });
    assert(createOrderRes.status === 201 || createOrderRes.status === 200, 'Order placed successfully (201 Created)');
    const testOrder = createOrderRes.data.order;
    const orderId = testOrder.id;
    const deliveryOtp = testOrder.deliveryOtp;
    assert(!!orderId, `Created Order ID: #${orderId}`);
    assert(!!deliveryOtp && deliveryOtp.length === 6, `Generated 6-digit Delivery OTP: ${deliveryOtp}`);

    // Verify stock deducted
    const tomatoDocAfter = await Product.findOne({ id: 'prod_vegetables_tomato' }).lean();
    const tomatoStockAfter = (tomatoDocAfter as any)?.stock || 0;
    assert(tomatoStockAfter === tomatoStockBefore - 2, `Tomato stock accurately decremented from ${tomatoStockBefore} to ${tomatoStockAfter}`);

    // Verify in customer order history
    const custOrders = await request('/api/orders', { token: custToken });
    assert(custOrders.status === 200 && custOrders.data.orders.some((o: any) => o.id === orderId), 'Order appears in customer order history');

    // 8. FARMER FLOW
    console.log('\n--- 8. Farmer Management Flow ---');
    const farmerLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'farmer@farmdirect.com', password: 'farmerpassword123', role: 'farmer' },
    });
    const farmerToken = farmerLogin.data.token;
    assert(!!farmerToken, 'Farmer logged in successfully');

    const randFarmProduce = Math.floor(1000 + Math.random() * 9000);
    const addProduceRes = await request('/api/products', {
      method: 'POST',
      token: farmerToken,
      body: {
        name: `Final Test Organic Mint ${randFarmProduce}`,
        category: 'Leafy Greens',
        price: 25,
        unit: 'Pack',
        stock: 50,
        organic: true,
        harvestDate: '2026-08-19',
      },
    });
    assert(addProduceRes.status === 201 && addProduceRes.data.success, 'Farmer uploaded new produce item (201)');
    const createdProduceId = addProduceRes.data.product.id;

    // Edit produce
    const editProduceRes = await request(`/api/products/${createdProduceId}`, {
      method: 'PUT',
      token: farmerToken,
      body: { price: 28, stock: 65 },
    });
    assert(editProduceRes.status === 200 && editProduceRes.data.success, 'Farmer edited produce price & stock');

    // 9. DELIVERY FLOW & OTP COMPLETION
    console.log('\n--- 9. Delivery Partner Flow & OTP Verification ---');
    const delivLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'delivery@farmdirect.com', password: 'deliverypassword123', role: 'delivery' },
    });
    const delivToken = delivLogin.data.token;
    const delivId = delivLogin.data.user.id;
    assert(!!delivToken, 'Delivery Partner logged in successfully');

    // Assign order
    const assignRes = await request(`/api/orders/${orderId}/assign`, {
      method: 'PATCH',
      token: delivToken,
      body: { deliveryBoyId: delivId },
    });
    assert(assignRes.status === 200 && assignRes.data.success, `Order #${orderId} assigned to delivery partner`);

    // Update status to Out for Delivery
    const outRes = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      token: delivToken,
      body: { status: 'Out for Delivery' },
    });
    assert(outRes.status === 200 && outRes.data.success, 'Order transitioned to "Out for Delivery"');

    // Verify Delivery OTP
    const verifyOtpRes = await request(`/api/orders/${orderId}/verify-delivery-otp`, {
      method: 'POST',
      token: delivToken,
      body: { otp: deliveryOtp },
    });
    assert(verifyOtpRes.status === 200 && verifyOtpRes.data.success, 'Delivery OTP verified successfully! Status: Delivered');

    // 10. ADMIN FLOW & ANALYTICS INTEGRITY
    console.log('\n--- 10. Admin Analytics & Management ---');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
    });
    const adminToken = adminLogin.data.token;
    assert(!!adminToken, 'Admin logged in successfully');

    const adminAnalytics = await request('/api/admin/analytics', { token: adminToken });
    assert(adminAnalytics.status === 200 && adminAnalytics.data.success, 'Admin analytics loaded (200)');
    console.log(`  Live Counts -> Total Products: ${adminAnalytics.data.analytics.products.total}, Total Orders: ${adminAnalytics.data.analytics.orders.total}, Revenue: ₹${adminAnalytics.data.analytics.revenue.total}`);

    // Admin approve produce
    const approveRes = await request(`/api/products/${createdProduceId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'Approved' },
    });
    assert(approveRes.status === 200 && approveRes.data.success, 'Admin approved produce listing');

    // Clean up test produce
    await request(`/api/products/${createdProduceId}`, { method: 'DELETE', token: adminToken });

    // 11. MULTI-ROLE AUTHORIZATION MATRIX
    console.log('\n--- 11. Multi-Role RBAC Authorization Matrix ---');
    const custToAdmin = await request('/api/admin/analytics', { token: custToken });
    assert(custToAdmin.status === 403, 'Customer -> Admin blocked (403 Forbidden)');

    const custToFarmer = await request('/api/products/my-products', { token: custToken });
    assert(custToFarmer.status === 403, 'Customer -> Farmer blocked (403 Forbidden)');

    const custToDeliv = await request('/api/delivery/payouts', { token: custToken });
    assert(custToDeliv.status === 403, 'Customer -> Delivery blocked (403 Forbidden)');

    const farmerToAdmin = await request('/api/admin/analytics', { token: farmerToken });
    assert(farmerToAdmin.status === 403, 'Farmer -> Admin blocked (403 Forbidden)');

    const delivToAdmin = await request('/api/admin/analytics', { token: delivToken });
    assert(delivToAdmin.status === 403, 'Delivery -> Admin blocked (403 Forbidden)');

    // 12. RESTART IDEMPOTENCY
    console.log('\n--- 12. Restart Idempotency Check ---');
    const prodCountBefore = await Product.countDocuments();
    await connectMongoDB();
    const prodCountAfter = await Product.countDocuments();
    assert(prodCountBefore === prodCountAfter, `Product count identical after restart (${prodCountAfter} products, 0 duplicates)`);

    console.log('\n================================================================');
    console.log('🎉 FINAL FULL END-TO-END REGRESSION PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runFinalE2ERegression().catch((err) => {
  console.error('Final E2E regression failed:', err);
  process.exit(1);
});
