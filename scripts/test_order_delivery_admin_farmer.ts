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

const PORT = 3008;

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
    res.json({ status: 'ok', name: 'FarmDirect Order Engine', version: '1.0.0' });
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

async function runOrderDeliveryAdminFarmerTest() {
  console.log('================================================================');
  console.log('📦 FARMMARKET: ORDER, DELIVERY, FARMER & ADMIN TEST SUITE');
  console.log('================================================================\n');

  await connectMongoDB();
  const server = await createTestServer();

  try {
    // Logins for all roles
    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.com', password: 'customerpassword123', role: 'customer' },
    });
    const custToken = custLogin.data.token;
    const custId = custLogin.data.user.id;

    // Register a second customer for IDOR testing
    const randCust = Math.floor(1000 + Math.random() * 9000);
    const cust2Login = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: `Second Customer ${randCust}`,
        email: `customer2_${randCust}@farmdirect.com`,
        password: 'password123',
        phone: '9876543210',
        role: 'customer',
      },
    });
    const cust2Token = cust2Login.data.token;

    const farmerLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'farmer@farmdirect.com', password: 'farmerpassword123', role: 'farmer' },
    });
    const farmerToken = farmerLogin.data.token;

    const delivLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'delivery@farmdirect.com', password: 'deliverypassword123', role: 'delivery' },
    });
    const delivToken = delivLogin.data.token;
    const delivId = delivLogin.data.user.id;

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
    });
    const adminToken = adminLogin.data.token;

    // ---------------------------------------------------------
    // 1. CUSTOMER ORDER FLOW & MONGODB PERSISTENCE
    // ---------------------------------------------------------
    console.log('--- 1. Customer Order Flow & MongoDB Persistence ---');
    const createOrderRes = await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod_vegetables_tomato', quantity: 2 }],
        deliveryAddress: {
          street: '15 Anna Salai',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641001',
        },
        deliveryMethod: 'home_delivery',
        paymentMethod: 'COD',
        useWallet: false,
      },
    });
    assert(createOrderRes.status === 201 || createOrderRes.status === 200, 'Order created successfully (201/200)');
    const orderObj = createOrderRes.data.order;
    const testOrderId = orderObj.id;
    const testDeliveryOtp = orderObj.deliveryOtp;
    assert(!!testOrderId, `Order ID created: #${testOrderId}`);
    assert(!!testDeliveryOtp && testDeliveryOtp.length === 6, `6-digit Delivery OTP: ${testDeliveryOtp}`);

    // Verify order in MongoDB collection
    const mongoOrder = await mongoose.connection.db!.collection('orders').findOne({ id: testOrderId });
    assert(!!mongoOrder, `Order #${testOrderId} verified in MongoDB orders collection`);
    assert(mongoOrder!.customerId === custId, 'MongoDB order has correct customerId');
    assert(mongoOrder!.orderStatus === 'Confirmed', 'MongoDB order status is Confirmed');

    // ---------------------------------------------------------
    // 2. ORDER INPUT VALIDATION
    // ---------------------------------------------------------
    console.log('\n--- 2. Order Input Validation Edge Cases ---');
    // Empty items
    const emptyOrder = await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: { items: [], deliveryAddress: { district: 'Coimbatore', pincode: '641001' } },
    });
    assert(emptyOrder.status === 400 && !emptyOrder.data.success, 'Empty items order rejected with 400');

    // Negative item quantity
    const negOrder = await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: { items: [{ productId: 'prod_vegetables_tomato', quantity: -2 }] },
    });
    assert(negOrder.status === 400 && !negOrder.data.success, 'Negative quantity order rejected with 400');

    // ---------------------------------------------------------
    // 3. ORDER HISTORY & CROSS-CUSTOMER PRIVACY (IDOR PROTECTION)
    // ---------------------------------------------------------
    console.log('\n--- 3. Order History & IDOR Privacy Protection ---');
    const cust1Orders = await request('/api/orders', { token: custToken });
    assert(cust1Orders.status === 200 && cust1Orders.data.orders.some((o: any) => o.id === testOrderId), 'Customer 1 sees their own order');

    const cust2Orders = await request('/api/orders', { token: cust2Token });
    assert(cust2Orders.status === 200 && !cust2Orders.data.orders.some((o: any) => o.id === testOrderId), 'Customer 2 CANNOT see Customer 1 order (IDOR protected)');

    // ---------------------------------------------------------
    // 4 & 5. FARMER PRODUCT & ORDER FLOW
    // ---------------------------------------------------------
    console.log('\n--- 4 & 5. Farmer Produce & Order Management ---');
    const randFarmerProd = Math.floor(1000 + Math.random() * 9000);
    const newProduceRes = await request('/api/products', {
      method: 'POST',
      token: farmerToken,
      body: {
        name: `Organic Fresh Spinach ${randFarmerProd}`,
        category: 'Leafy Greens',
        price: 30,
        unit: 'Pack',
        stock: 60,
        organic: true,
        harvestDate: '2026-08-19',
      },
    });
    assert(newProduceRes.status === 201 && newProduceRes.data.success, 'Farmer added produce item (201 Created)');
    const farmerCreatedId = newProduceRes.data.product.id;

    // Reject invalid inputs on product upload
    const invalidProdRes = await request('/api/products', {
      method: 'POST',
      token: farmerToken,
      body: { name: '', price: -10, category: 'Vegetables' },
    });
    assert(invalidProdRes.status === 400 && !invalidProdRes.data.success, 'Invalid produce upload rejected with 400');

    // Farmer edits produce
    const editProduceRes = await request(`/api/products/${farmerCreatedId}`, {
      method: 'PUT',
      token: farmerToken,
      body: { price: 32, stock: 75 },
    });
    assert(editProduceRes.status === 200 && editProduceRes.data.success, 'Farmer updated produce price & stock');

    // ---------------------------------------------------------
    // 6. INVENTORY AFTER ORDER DEDUCTION
    // ---------------------------------------------------------
    console.log('\n--- 6. Stock Deduction Verification ---');
    const onionDocBefore = await Product.findOne({ id: 'prod_vegetables_onion' }).lean();
    const onionStockBefore = (onionDocBefore as any)?.stock || 100;
    console.log(`  Initial Onion Stock: ${onionStockBefore} kg`);

    // Place order for 3 kg Onion
    await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod_vegetables_onion', quantity: 3 }],
        deliveryAddress: { district: 'Coimbatore', pincode: '641001', street: '12 Cross Road' },
        deliveryMethod: 'home_delivery',
        paymentMethod: 'COD',
        useWallet: false,
      },
    });

    const onionDocAfter = await Product.findOne({ id: 'prod_vegetables_onion' }).lean();
    const onionStockAfter = (onionDocAfter as any)?.stock || 0;
    console.log(`  Updated Onion Stock: ${onionStockAfter} kg`);
    assert(onionStockAfter === onionStockBefore - 3, 'Stock accurately reduced by 3 in MongoDB');

    // ---------------------------------------------------------
    // 7 & 8. DELIVERY DASHBOARD, ASSIGNMENT & OTP LIFECYCLE
    // ---------------------------------------------------------
    console.log('\n--- 7 & 8. Delivery Partner Workflow & Security ---');
    
    // Assign delivery partner
    const assignRes = await request(`/api/orders/${testOrderId}/assign`, {
      method: 'PATCH',
      token: delivToken,
      body: { deliveryBoyId: delivId },
    });
    assert(assignRes.status === 200 && assignRes.data.success, `Order #${testOrderId} assigned to Delivery Partner`);

    // Update status to Out for Delivery
    const outRes = await request(`/api/orders/${testOrderId}/status`, {
      method: 'PATCH',
      token: delivToken,
      body: { status: 'Out for Delivery' },
    });
    assert(outRes.status === 200 && outRes.data.success, 'Order transitioned to "Out for Delivery"');

    // Test Wrong OTP rejection
    const wrongOtpRes = await request(`/api/orders/${testOrderId}/verify-delivery-otp`, {
      method: 'POST',
      token: delivToken,
      body: { otp: '000000' },
    });
    assert(wrongOtpRes.status === 400 && !wrongOtpRes.data.success, 'Wrong Delivery OTP rejected with 400');

    // Complete delivery with correct OTP
    const correctOtpRes = await request(`/api/orders/${testOrderId}/verify-delivery-otp`, {
      method: 'POST',
      token: delivToken,
      body: { otp: testDeliveryOtp },
    });
    assert(correctOtpRes.status === 200 && correctOtpRes.data.success, 'Delivery verified with OTP! Status: Delivered');

    // Delivery Partner RBAC guard
    const delivToAdmin = await request('/api/admin/analytics', { token: delivToken });
    assert(delivToAdmin.status === 403, 'Delivery partner blocked from Admin analytics (403 Forbidden)');

    // ---------------------------------------------------------
    // 9, 10, 11 & 12. ADMIN DASHBOARD, USERS & ORDER AUDIT
    // ---------------------------------------------------------
    console.log('\n--- 9-12. Admin Management & Database Analytics ---');
    const adminAnalytics = await request('/api/admin/analytics', { token: adminToken });
    assert(adminAnalytics.status === 200 && adminAnalytics.data.success, 'Admin analytics loaded successfully (200)');
    console.log(`  Admin Live Metrics -> Farmers: ${adminAnalytics.data.analytics.users.farmers}, Total Products: ${adminAnalytics.data.analytics.products.total}, Total Orders: ${adminAnalytics.data.analytics.orders.total}`);

    const adminUsers = await request('/api/admin/users', { token: adminToken });
    assert(adminUsers.status === 200 && adminUsers.data.success, 'Admin retrieved users directory (200)');
    // Verify password hashes are never exposed in user list
    const hasPlaintextPassword = (adminUsers.data.users || []).some((u: any) => u.password && !u.password.startsWith('$2'));
    assert(!hasPlaintextPassword, 'Zero plaintext passwords in user management response');

    // ---------------------------------------------------------
    // 13. CROSS-PORTAL STATUS CONSISTENCY
    // ---------------------------------------------------------
    console.log('\n--- 13. Order Status Consistency Across Dashboards ---');
    const custView = (await request('/api/orders', { token: custToken })).data.orders.find((o: any) => o.id === testOrderId);
    const adminView = (await request('/api/orders', { token: adminToken })).data.orders.find((o: any) => o.id === testOrderId);

    assert(custView?.orderStatus === 'Delivered', 'Customer portal reflects status "Delivered"');
    assert(adminView?.orderStatus === 'Delivered', 'Admin portal reflects status "Delivered"');

    // Clean up test produce
    await request(`/api/products/${farmerCreatedId}`, { method: 'DELETE', token: adminToken });

    console.log('\n================================================================');
    console.log('🎉 ALL ORDER, DELIVERY, FARMER & ADMIN TESTS PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runOrderDeliveryAdminFarmerTest().catch((err) => {
  console.error('Order Delivery Admin Farmer test failed:', err);
  process.exit(1);
});
