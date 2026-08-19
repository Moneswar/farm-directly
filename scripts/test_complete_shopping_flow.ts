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
import { authenticateToken, requireRole } from '../backend/middlewares/auth.js';
import { calculateCustomerSellingPrice } from '../backend/services/storage.js';

const PORT = 3007;

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
    res.json({ status: 'ok', name: 'FarmDirect Shopping Engine', version: '1.0.0' });
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

async function runShoppingFlowTest() {
  console.log('================================================================');
  console.log('🛒 FARMMARKET: COMPLETE PRODUCT & SHOPPING FUNCTIONALITY TEST');
  console.log('================================================================\n');

  await connectMongoDB();
  const server = await createTestServer();

  try {
    // ---------------------------------------------------------
    // 1. PRODUCT LISTING AUDIT
    // ---------------------------------------------------------
    console.log('--- 1. Product Listing & Catalog Health ---');
    const catalogRes = await request('/api/products?status=Approved');
    assert(catalogRes.status === 200 && catalogRes.data.success, 'Catalog API returned 200 OK');
    const products = catalogRes.data.products || [];
    assert(products.length >= 120, `Catalog loaded ${products.length} approved products`);

    // Verify properties on every product
    for (const p of products) {
      assert(!!p.id && !!p.name && !!p.category && typeof p.price === 'number' && p.price > 0, `Product ${p.name} has valid fields`);
    }

    // ---------------------------------------------------------
    // 2. CATEGORY FILTERING (ALL 10 INDIVIDUAL CATEGORIES)
    // ---------------------------------------------------------
    console.log('\n--- 2. Category Filtering (All 10 Categories Tested) ---');
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

    for (const cat of categories) {
      const res = await request(`/api/products?category=${encodeURIComponent(cat)}&status=Approved`);
      assert(res.status === 200 && res.data.success, `Category query for "${cat}" returned 200`);
      const catProds = res.data.products || [];
      assert(catProds.length > 0, `Category "${cat}" contains ${catProds.length} items`);
      const wrongCat = catProds.filter((p: any) => p.category !== cat);
      assert(wrongCat.length === 0, `Zero cross-category items in "${cat}"`);
      const coconuts = catProds.filter((p: any) => /coconut/i.test(p.name));
      assert(coconuts.length === 0, `Zero coconut items in "${cat}"`);
    }

    // ---------------------------------------------------------
    // 3. COCONUT PRODUCT ISSUE AUDIT
    // ---------------------------------------------------------
    console.log('\n--- 3. Coconut Produce Scan ---');
    const coconutSearch = await request('/api/products?search=coconut');
    assert(coconutSearch.status === 200 && (coconutSearch.data.products || []).length === 0, 'Search for "coconut" returns 0 products');

    const freshCoconutSearch = await request('/api/products?search=Fresh+Farm+Coconut');
    assert(freshCoconutSearch.status === 200 && (freshCoconutSearch.data.products || []).length === 0, 'Search for "Fresh Farm Coconut" returns 0 products');

    // ---------------------------------------------------------
    // 4. PRODUCT SEARCH
    // ---------------------------------------------------------
    console.log('\n--- 4. Search Functionality ---');
    
    // Search Apple
    const appleRes = await request('/api/products?search=Apple');
    assert(appleRes.status === 200 && appleRes.data.products.some((p: any) => /apple/i.test(p.name)), 'Search for "Apple" returned Apple');

    // Search Banana
    const bananaRes = await request('/api/products?search=Banana');
    assert(bananaRes.status === 200 && bananaRes.data.products.some((p: any) => /banana/i.test(p.name)), 'Search for "Banana" returned Banana');

    // Search Tomato
    const tomatoRes = await request('/api/products?search=Tomato');
    assert(tomatoRes.status === 200 && tomatoRes.data.products.some((p: any) => /tomato/i.test(p.name)), 'Search for "Tomato" returned Tomato');

    // Search Carrot
    const carrotRes = await request('/api/products?search=Carrot');
    assert(carrotRes.status === 200 && carrotRes.data.products.some((p: any) => /carrot/i.test(p.name)), 'Search for "Carrot" returned Carrot');

    // Search Non-existing item
    const ghostRes = await request('/api/products?search=nonexistent_xyz_item_999');
    assert(ghostRes.status === 200 && (ghostRes.data.products || []).length === 0, 'Search for nonexistent item returned 0 results gracefully');

    // ---------------------------------------------------------
    // 5. PRODUCT DETAILS
    // ---------------------------------------------------------
    console.log('\n--- 5. Product Details ---');
    const detailsRes = await request('/api/products/prod_fruits_apple');
    assert(detailsRes.status === 200 && detailsRes.data.success, 'Product details API returned 200');
    assert(detailsRes.data.product.id === 'prod_fruits_apple', 'Product details ID matches');
    assert(detailsRes.data.product.name === 'Apple', 'Product name is "Apple"');
    assert(detailsRes.data.product.category === 'Fruits', 'Product category is "Fruits"');
    assert(typeof detailsRes.data.product.price === 'number', 'Product price is numeric');

    // ---------------------------------------------------------
    // 6. SORTING FUNCTIONALITY
    // ---------------------------------------------------------
    console.log('\n--- 6. Sorting Functionality ---');
    const sortLowRes = await request('/api/products?category=Fruits&sortBy=price-low');
    const lowPrices = (sortLowRes.data.products || []).map((p: any) => p.price);
    const isSortedAsc = lowPrices.every((val: number, i: number, arr: number[]) => i === 0 || arr[i - 1] <= val);
    assert(isSortedAsc, 'Products sorted price-low in ascending order');

    const sortHighRes = await request('/api/products?category=Fruits&sortBy=price-high');
    const highPrices = (sortHighRes.data.products || []).map((p: any) => p.price);
    const isSortedDesc = highPrices.every((val: number, i: number, arr: number[]) => i === 0 || arr[i - 1] >= val);
    assert(isSortedDesc, 'Products sorted price-high in descending order');

    // ---------------------------------------------------------
    // 7 & 8. CART OPERATIONS & VALIDATION
    // ---------------------------------------------------------
    console.log('\n--- 7 & 8. Cart Operations & Stock Boundaries ---');
    // Login Customer
    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.com', password: 'customerpassword123', role: 'customer' },
    });
    const custToken = custLogin.data.token;

    // Add item (qty 2)
    const addRes = await request('/api/customer/cart/add', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_vegetables_potato', quantity: 2 },
    });
    assert(addRes.status === 200 && addRes.data.success, 'Added 2 Potato to cart (200)');

    // Negative quantity rejected
    const negQtyRes = await request('/api/customer/cart/add', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_vegetables_potato', quantity: -3 },
    });
    assert(negQtyRes.status === 400, 'Negative cart quantity rejected with 400 Bad Request');

    // Exceeding stock quantity rejected
    const exceedStockRes = await request('/api/customer/cart/add', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_vegetables_potato', quantity: 99999 },
    });
    assert(exceedStockRes.status === 400, 'Exceeding stock quantity rejected with 400 Bad Request');

    // Update quantity
    const updateQtyRes = await request('/api/customer/cart/update', {
      method: 'PUT',
      token: custToken,
      body: { productId: 'prod_vegetables_potato', quantity: 3 },
    });
    assert(updateQtyRes.status === 200 && updateQtyRes.data.success, 'Cart quantity updated to 3');

    // ---------------------------------------------------------
    // 9. WISHLIST
    // ---------------------------------------------------------
    console.log('\n--- 9. Wishlist Operations ---');
    const wishToggle = await request('/api/customer/wishlist/toggle', {
      method: 'POST',
      token: custToken,
      body: { productId: 'prod_fruits_mango' },
    });
    assert(wishToggle.status === 200 && wishToggle.data.success, 'Toggled item in wishlist');

    const wishList = await request('/api/customer/wishlist', { token: custToken });
    assert(wishList.status === 200 && Array.isArray(wishList.data.wishlist), 'Retrieved wishlist array');

    // ---------------------------------------------------------
    // 10 & 11. CHECKOUT, ORDER CREATION & INVENTORY DEDUCTION
    // ---------------------------------------------------------
    console.log('\n--- 10 & 11. Checkout, Order Placement & Stock Deduction ---');
    
    // Check initial stock
    const prodDocBefore = await Product.findOne({ id: 'prod_vegetables_potato' }).lean();
    const stockBefore = (prodDocBefore as any)?.stock || 0;
    console.log(`  Initial stock for Potato: ${stockBefore} kg`);

    // Delivery calculation preview
    const delivCalc = await request('/api/orders/calculate-delivery', {
      method: 'POST',
      body: { district: 'Coimbatore', pincode: '641004', deliveryMethod: 'home_delivery' },
    });
    assert(delivCalc.status === 200 && delivCalc.data.success, 'Calculated delivery preview');

    // Place Order for 2 kg Potato
    const orderRes = await request('/api/orders/create', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod_vegetables_potato', quantity: 2 }],
        deliveryAddress: {
          street: '100 Cross Cut Road',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641004',
        },
        deliveryMethod: 'home_delivery',
        paymentMethod: 'COD',
        useWallet: false,
      },
    });
    if (!orderRes.data?.success) {
      console.error('Order creation failed with response:', orderRes);
    }
    assert((orderRes.status === 200 || orderRes.status === 201) && orderRes.data.success, 'Order created successfully');
    const createdOrderId = orderRes.data.order.id;
    const deliveryOtp = orderRes.data.order.deliveryOtp;
    assert(!!createdOrderId, `Order created with ID #${createdOrderId}`);
    assert(!!deliveryOtp && deliveryOtp.length === 6, `Generated 6-digit delivery OTP: ${deliveryOtp}`);

    // Verify stock deducted in MongoDB
    const prodDocAfter = await Product.findOne({ id: 'prod_vegetables_potato' }).lean();
    const stockAfter = (prodDocAfter as any)?.stock || 0;
    console.log(`  Updated stock for Potato: ${stockAfter} kg (Deducted 2 kg)`);
    assert(stockAfter === stockBefore - 2, 'Stock deducted accurately in MongoDB by order quantity');

    // Customer views order history
    const orderHistory = await request('/api/orders', { token: custToken });
    assert(orderHistory.status === 200 && orderHistory.data.orders.some((o: any) => o.id === createdOrderId), 'Created order appears in customer order history');

    // ---------------------------------------------------------
    // 14. FARMER PRODUCE CREATION & ADMIN APPROVAL FLOW
    // ---------------------------------------------------------
    console.log('\n--- 14. Farmer Produce Management & Admin Approval ---');
    const farmerLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'farmer@farmdirect.com', password: 'farmerpassword123', role: 'farmer' },
    });
    const farmerToken = farmerLogin.data.token;

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
    });
    const adminToken = adminLogin.data.token;

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const newFarmerProd = await request('/api/products', {
      method: 'POST',
      token: farmerToken,
      body: {
        name: `Farm Fresh Crisp Lettuce ${randNum}`,
        category: 'Leafy Greens',
        price: 35,
        unit: 'Pack',
        stock: 50,
        organic: true,
        harvestDate: '2026-08-19',
      },
    });
    assert(newFarmerProd.status === 201 && newFarmerProd.data.success, 'Farmer uploaded new produce item (201 Created)');
    const farmerProdId = newFarmerProd.data.product.id;

    // Admin approves produce
    const approveRes = await request(`/api/products/${farmerProdId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'Approved' },
    });
    assert(approveRes.status === 200 && approveRes.data.success, 'Admin approved farmer produce item');

    // Farmer edits price
    const editRes = await request(`/api/products/${farmerProdId}`, {
      method: 'PUT',
      token: farmerToken,
      body: { price: 38, stock: 45 },
    });
    assert(editRes.status === 200 && editRes.data.success, 'Farmer updated product price and stock');

    // Cleanup test produce
    await request(`/api/products/${farmerProdId}`, { method: 'DELETE', token: adminToken });

    // ---------------------------------------------------------
    // 15. DATA CONSISTENCY (MongoDB <-> API <-> Frontend)
    // ---------------------------------------------------------
    console.log('\n--- 15. Data Contract & Consistency Validation ---');
    const dbApple = await Product.findOne({ id: 'prod_fruits_apple' }).lean();
    const apiApple = (await request('/api/products/prod_fruits_apple')).data.product;
    assert((dbApple as any).name === apiApple.name, 'Name matches between MongoDB and API');
    assert(apiApple.price === calculateCustomerSellingPrice(dbApple as any), 'Customer price matches calculated selling price rule (₹' + apiApple.price + ')');
    assert((dbApple as any).category === apiApple.category, 'Category matches between MongoDB and API');
    assert((dbApple as any).stock === apiApple.stock, 'Stock matches between MongoDB and API');

    console.log('\n================================================================');
    console.log('🎉 ALL PRODUCT & SHOPPING FUNCTIONALITY TESTS PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runShoppingFlowTest().catch((err) => {
  console.error('Shopping flow test failed:', err);
  process.exit(1);
});
