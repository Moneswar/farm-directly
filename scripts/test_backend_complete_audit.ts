import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectMongoDB } from '../backend/config/db.js';
import { Product } from '../backend/models/Product.js';
import authRoutes from '../backend/routes/authRoutes.js';
import productRoutes from '../backend/routes/productRoutes.js';
import orderRoutes from '../backend/routes/orderRoutes.js';
import adminRoutes from '../backend/routes/adminRoutes.js';
import customerRoutes from '../backend/routes/customerRoutes.js';
import notificationRoutes from '../backend/routes/notificationRoutes.js';
import paymentRoutes from '../backend/routes/paymentRoutes.js';
import { getActiveHubs, getFarmerCollections, updateCollectionStatus, getDeliveryPayouts } from '../backend/controllers/hubController.js';
import { authenticateToken } from '../backend/middlewares/auth.js';

const PORT = 3005;

async function createTestServer(): Promise<http.Server> {
  await connectMongoDB();

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
  app.get('/api/collections', authenticateToken, getFarmerCollections);
  app.patch('/api/collections/:id/status', authenticateToken, updateCollectionStatus);
  app.get('/api/delivery/payouts', authenticateToken, getDeliveryPayouts);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'FarmDirect API Engine', version: '1.0.0' });
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

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 FARMMARKET COMPLETE BACKEND & API AUDIT SUITE');
  console.log('================================================================\n');

  // Start fresh server instance on test port
  const server = await createTestServer();
  console.log(`Test server bound to http://127.0.0.1:${PORT}\n`);

  try {
    // STEP 1: SERVER & HEALTH CHECK
    console.log('--- STEP 1: Backend Startup & Health Check ---');
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returned 200 OK');

    // STEP 2 & 4: AUTHENTICATION & ROLE ISOLATION
    console.log('\n--- STEP 2 & 4: Authentication & Role-Based Access Control ---');
    
    // 1. Customer Login
    const custRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.com', password: 'customerpassword123', role: 'customer' },
    });
    assert(custRes.status === 200 && custRes.data.success, 'Customer login succeeded (200)');
    const custToken = custRes.data.token;
    assert(!!custToken, 'Customer JWT generated');

    // 2. Farmer Login
    const farmerRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'farmer@farmdirect.com', password: 'farmerpassword123', role: 'farmer' },
    });
    assert(farmerRes.status === 200 && farmerRes.data.success, 'Farmer login succeeded (200)');
    const farmerToken = farmerRes.data.token;

    // 3. Delivery Login
    const deliveryRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'delivery@farmdirect.com', password: 'deliverypassword123', role: 'delivery' },
    });
    assert(deliveryRes.status === 200 && deliveryRes.data.success, 'Delivery partner login succeeded (200)');
    const deliveryToken = deliveryRes.data.token;

    // 4. Admin Login
    const adminRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
    });
    assert(adminRes.status === 200 && adminRes.data.success, 'Admin login succeeded (200)');
    const adminToken = adminRes.data.token;

    // 5. Shopkeeper Login
    const shopRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'shopkeeper@farmdirect.com', password: 'customerpassword123', role: 'shopkeeper' },
    });
    assert(shopRes.status === 200 && shopRes.data.success, 'Shopkeeper login succeeded (200)');
    const shopToken = shopRes.data.token;

    // 6. Role Protection Test: Customer attempting to call Admin endpoint
    const unauthorizedAdmin = await request('/api/admin/analytics', { token: custToken });
    assert(unauthorizedAdmin.status === 403, 'Customer blocked from Admin analytics (403 Forbidden)');

    // 7. Role Protection Test: Farmer attempting to call Delivery endpoint
    const unauthorizedDelivery = await request('/api/orders/ORD-123/assign', {
      method: 'PATCH',
      token: farmerToken,
      body: { deliveryBoyId: 'user_delivery' },
    });
    assert(unauthorizedDelivery.status === 403, 'Farmer blocked from assigning delivery (403 Forbidden)');

    // 8. Missing token test
    const missingTokenRes = await request('/api/auth/profile');
    assert(missingTokenRes.status === 401, 'Unauthenticated request rejected with 401');

    // STEP 5: PRODUCT APIS & CATALOG AUDIT
    console.log('\n--- STEP 5: Product APIs & Catalog Audit ---');
    
    // 1. Get all products
    const prodsRes = await request('/api/products?status=Approved');
    assert(prodsRes.status === 200 && prodsRes.data.success, 'GET /api/products returned 200');
    const allProds = prodsRes.data.products || [];
    assert(allProds.length > 0, `Catalog returned ${allProds.length} products`);

    // 2. Single product by ID
    const singleProd = await request('/api/products/prod_fruits_apple');
    assert(singleProd.status === 200 && singleProd.data.product.name === 'Apple', 'GET /api/products/:id returned Apple product');

    // 3. Search product
    const searchTomato = await request('/api/products?search=Tomato');
    assert(searchTomato.status === 200 && searchTomato.data.products.length > 0, 'Search for "Tomato" returned results');

    // 4. Search coconut (must be 0)
    const searchCoconut = await request('/api/products?search=coconut');
    assert(searchCoconut.status === 200 && searchCoconut.data.products.length === 0, 'Search for "coconut" returned 0 products');

    // 5. Price sorting
    const sortLow = await request('/api/products?sortBy=price-low');
    const pricesLow = (sortLow.data.products || []).map((p: any) => p.price);
    const isSortedLow = pricesLow.every((val: number, i: number, arr: number[]) => i === 0 || arr[i - 1] <= val);
    assert(isSortedLow, 'Products sorted by price ascending (price-low)');

    // 6. Organic filter
    const organicProds = await request('/api/products?organic=true');
    const allOrganic = (organicProds.data.products || []).every((p: any) => p.organic === true);
    assert(allOrganic && organicProds.data.products.length > 0, 'Organic produce filter works correctly');

    // STEP 6: CATEGORY AUDIT (ALL 10 CATEGORIES)
    console.log('\n--- STEP 6: Category APIs (Strict 10 Categories) ---');
    const expectedCategories = [
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

    for (const cat of expectedCategories) {
      const catRes = await request(`/api/products?category=${encodeURIComponent(cat)}&status=Approved`);
      assert(catRes.status === 200 && catRes.data.success, `Category "${cat}" query returned 200`);
      const prods = catRes.data.products || [];
      assert(prods.length > 0, `Category "${cat}" has ${prods.length} active products`);
      const coconuts = prods.filter((p: any) => /coconut/i.test(p.name));
      assert(coconuts.length === 0, `Category "${cat}" has 0 coconut items`);
    }

    // STEP 8: CART APIS
    console.log('\n--- STEP 8: Cart APIs ---');
    // 1. Add to cart
    const addCart = await request('/api/customer/cart/add', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_vegetables_tomato', quantity: 3 },
    });
    assert(addCart.status === 200 && addCart.data.success, 'Added 3 Tomatos to cart (200)');

    // 2. Get cart
    const getCart = await request('/api/customer/cart', { token: custToken });
    assert(getCart.status === 200 && getCart.data.success, 'Fetched customer cart (200)');
    assert(Array.isArray(getCart.data.cart) && getCart.data.cart.length > 0, 'Cart contains active items');

    // 3. Update cart quantity
    const updateCart = await request('/api/customer/cart/update', {
      method: 'PUT',
      token: custToken,
      body: { productId: 'prod_vegetables_tomato', quantity: 2 },
    });
    assert(updateCart.status === 200 && updateCart.data.success, 'Updated cart item quantity to 2 (200)');

    // 4. Reject negative quantity
    const rejectNeg = await request('/api/customer/cart/add', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_vegetables_tomato', quantity: -5 },
    });
    assert(rejectNeg.status === 400, 'Negative quantity rejected with 400 Bad Request');

    // STEP 9: WISHLIST APIS
    console.log('\n--- STEP 9: Wishlist APIs ---');
    const toggleWish = await request('/api/customer/wishlist/toggle', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_fruits_mango' },
    });
    assert(toggleWish.status === 200 && toggleWish.data.success, 'Toggled wishlist item (200)');

    const getWish = await request('/api/customer/wishlist', { token: custToken });
    assert(getWish.status === 200 && Array.isArray(getWish.data.wishlist), 'Fetched customer wishlist (200)');

    // STEP 10: ORDER APIS & CALCULATIONS
    console.log('\n--- STEP 10: Order APIs & Authoritative Backend Calculation ---');
    const delivPreview = await request('/api/orders/calculate-delivery', {
      method: 'POST',
      body: { district: 'Coimbatore', pincode: '641004', deliveryMethod: 'home_delivery' },
    });
    assert(delivPreview.status === 200 && delivPreview.data.success, 'POST /orders/calculate-delivery returned 200');
    assert(typeof delivPreview.data.deliveryCharge === 'number', 'Authoritative delivery charge calculated');

    // Create order
    const createOrderRes = await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod_vegetables_tomato', quantity: 2 }],
        deliveryAddress: {
          street: '12 Temple Road',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641004',
        },
        deliveryMethod: 'home_delivery',
        paymentMethod: 'COD',
        useWallet: false,
      },
    });
    assert((createOrderRes.status === 201 || createOrderRes.status === 200) && createOrderRes.data.success, 'Order created successfully (201/200)');
    const createdOrderId = createOrderRes.data.order.id;
    assert(!!createdOrderId, `Created Order #${createdOrderId}`);

    // Fetch orders
    const getOrdersRes = await request('/api/orders', { token: custToken });
    assert(getOrdersRes.status === 200 && getOrdersRes.data.success, 'GET /api/orders returned customer orders');

    // Cancel order before dispatch
    const cancelOrderRes = await request(`/api/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      token: custToken,
    });
    assert(cancelOrderRes.status === 200 && cancelOrderRes.data.success, `Order #${createdOrderId} cancelled successfully`);

    // STEP 11: DELIVERY PARTNER APIS & OTP VERIFICATION
    console.log('\n--- STEP 11: Delivery Partner APIs & Security ---');
    const delivOrdersRes = await request('/api/orders', { token: deliveryToken });
    assert(delivOrdersRes.status === 200 && delivOrdersRes.data.success, 'Delivery partner retrieved assigned orders feed');

    const delivPayoutsRes = await request('/api/delivery/payouts', { token: deliveryToken });
    assert(delivPayoutsRes.status === 200 && delivPayoutsRes.data.success, 'Delivery partner retrieved earnings & payout history');

    // STEP 12: ADMIN APIS
    console.log('\n--- STEP 12: Admin Management & Analytics APIs ---');
    const adminStats = await request('/api/admin/analytics', { token: adminToken });
    assert(adminStats.status === 200 && adminStats.data.success, 'Admin analytics endpoint returned 200');

    const adminUsers = await request('/api/admin/users', { token: adminToken });
    assert(adminUsers.status === 200 && adminUsers.data.success, 'Admin retrieved registered users list (200)');

    const adminHubs = await request('/api/admin/hubs', { token: adminToken });
    assert(adminHubs.status === 200 && adminHubs.data.success, 'Admin retrieved distribution hubs list (200)');

    const adminCoupons = await request('/api/admin/coupons', { token: adminToken });
    assert(adminCoupons.status === 200 && adminCoupons.data.success, 'Admin retrieved coupons list (200)');

    const adminForecasts = await request('/api/admin/forecasts', { token: adminToken });
    assert(adminForecasts.status === 200 && adminForecasts.data.success, 'Admin retrieved AI demand forecasts (200)');

    // STEP 13: FARMER APIS
    console.log('\n--- STEP 13: Farmer Produce Management APIs ---');
    const farmerProdsRes = await request('/api/products/my-products', { token: farmerToken });
    assert(farmerProdsRes.status === 200 && farmerProdsRes.data.success, 'Farmer retrieved their produce inventory (200)');

    // STEP 14: ERROR HANDLING & CONTRACT VALIDATION
    console.log('\n--- STEP 14: Error Handling Edge Cases ---');
    // 1. Invalid Product ID
    const invalidProd = await request('/api/products/nonexistent_product_id_99999');
    assert(invalidProd.status === 404 && invalidProd.data.success === false, 'Invalid product ID returned 404 JSON');

    // 2. Missing required fields in login
    const badLogin = await request('/api/auth/login', { method: 'POST', body: {} });
    assert(badLogin.status === 400 && badLogin.data.success === false, 'Missing credentials returned 400 JSON');

    // 3. Malformed token
    const badToken = await request('/api/auth/profile', { token: 'invalid_malformed_jwt_token' });
    assert(badToken.status === 403, 'Malformed token returned 403 Forbidden');

    // STEP 16: RESTART IDEMPOTENCY CHECK
    console.log('\n--- STEP 16: Startup Idempotency & Database Integrity ---');
    await mongoose.connect('mongodb://127.0.0.1:27017/farm');
    const countBefore = await Product.countDocuments();
    console.log(`Product count in MongoDB before sync: ${countBefore}`);

    // Re-run connectMongoDB() twice to simulate server restarts
    await connectMongoDB();
    await connectMongoDB();

    const countAfter = await Product.countDocuments();
    console.log(`Product count in MongoDB after double sync: ${countAfter}`);
    assert(countBefore === countAfter, 'Database synchronization is 100% IDEMPOTENT (Zero duplicate products created)');

    const coconutCount = await Product.countDocuments({ name: /coconut/i });
    assert(coconutCount === 0, 'MongoDB products collection has 0 coconut records after restart sync');

    await mongoose.disconnect();

    console.log('\n================================================================');
    console.log('🎉 ALL BACKEND & API AUDIT SUITES PASSED FLAWLESSLY (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runAudit().catch((err) => {
  console.error('Audit suite failed with error:', err);
  process.exit(1);
});
