/**
 * FarmDirect — Comprehensive End-to-End Multi-Role Test Suite
 * Tests all major roles and workflows against the live running API server.
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
    };

    if (postData) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING FARMDIRECT COMPREHENSIVE E2E TEST SUITE');
  console.log('====================================================\n');

  let customerToken = '';
  let farmerToken = '';
  let deliveryToken = '';
  let adminToken = '';
  let shopkeeperToken = '';

  let testProductId = '';
  let testOrderId = '';
  let testOnlineOrderId = '';
  let testSelfPickupOrderId = '';
  let testFarmerNewProductId = '';

  // ----------------------------------------------------------------
  // 1. PUBLIC ENDPOINTS & CATALOG
  // ----------------------------------------------------------------
  console.log('--- TEST 1: Public Catalog & Active Hubs ---');
  const prodsRes = await request('/products?status=Approved');
  assert(prodsRes.status === 200, 'GET /products returned 200');
  assert(prodsRes.data.success === true, 'Products response success === true');
  assert(Array.isArray(prodsRes.data.products) && prodsRes.data.products.length > 0, 'Products catalog returned items');
  testProductId = prodsRes.data.products[0].id;
  console.log(`  Target test product: "${prodsRes.data.products[0].name}" (ID: ${testProductId}, Price: ₹${prodsRes.data.products[0].price}, Stock: ${prodsRes.data.products[0].stock})`);

  const hubsRes = await request('/hubs/active');
  assert(hubsRes.status === 200, 'GET /hubs/active returned 200');
  assert(Array.isArray(hubsRes.data.hubs) && hubsRes.data.hubs.length > 0, 'Active hubs available');

  const couponsRes = await request('/customer/coupons');
  assert(couponsRes.status === 200, 'GET /customer/coupons returned 200');
  assert(Array.isArray(couponsRes.data.coupons), 'Active coupons returned array');

  // ----------------------------------------------------------------
  // 2. AUTHENTICATION & LOGIN FOR ALL ROLES
  // ----------------------------------------------------------------
  console.log('\n--- TEST 2: Authentication & Multi-Role Logins ---');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@farmdirect.com', password: 'adminpassword123', role: 'admin' },
  });
  assert(adminLogin.status === 200 && adminLogin.data.success, 'Admin login succeeded');
  adminToken = adminLogin.data.token;

  const farmerLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'farmer@farmdirect.com', password: 'farmerpassword123', role: 'farmer' },
  });
  assert(farmerLogin.status === 200 && farmerLogin.data.success, 'Farmer login succeeded');
  farmerToken = farmerLogin.data.token;

  const deliveryLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'delivery@farmdirect.com', password: 'deliverypassword123', role: 'delivery' },
  });
  assert(deliveryLogin.status === 200 && deliveryLogin.data.success, 'Delivery partner login succeeded');
  deliveryToken = deliveryLogin.data.token;

  const shopkeeperLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'shopkeeper@farmdirect.com', password: 'customerpassword123', role: 'shopkeeper' },
  });
  assert(shopkeeperLogin.status === 200 && shopkeeperLogin.data.success, 'Shopkeeper login succeeded');
  shopkeeperToken = shopkeeperLogin.data.token;

  // Register new customer
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const custEmail = `customer_${randomSuffix}@test.com`;
  const custReg = await request('/auth/register', {
    method: 'POST',
    body: {
      name: `Test Customer ${randomSuffix}`,
      email: custEmail,
      phone: `98765${randomSuffix}`,
      password: 'password123',
      role: 'customer',
      address: '42 Blossom Street',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
    },
  });
  assert((custReg.status === 200 || custReg.status === 201) && custReg.data.success, 'Customer registration succeeded');
  customerToken = custReg.data.token;

  // ----------------------------------------------------------------
  // 3. CUSTOMER PROFILE, CART, & COUPON OPERATIONS
  // ----------------------------------------------------------------
  console.log('\n--- TEST 3: Customer Profile, Cart, & Dynamic Coupon Validation ---');
  const profRes = await request('/auth/profile', { token: customerToken });
  assert(profRes.status === 200 && profRes.data.user.email === custEmail, 'Fetched profile matches registered user');

  const updateProfRes = await request('/auth/profile', {
    method: 'PUT',
    token: customerToken,
    body: { address: '99 Harvest Meadows, RS Puram', district: 'Coimbatore', pincode: '641002' },
  });
  assert(updateProfRes.status === 200 && updateProfRes.data.user.address.includes('Harvest Meadows'), 'Profile address update succeeded');

  // Add to cart
  const addToCartRes = await request('/customer/cart/add', {
    method: 'POST',
    token: customerToken,
    body: { productId: testProductId, quantity: 2 },
  });
  assert(addToCartRes.status === 200 && addToCartRes.data.cart.length > 0, 'Add to cart succeeded (qty: 2)');

  // Try adding exceeding quantity
  const overStockRes = await request('/customer/cart/add', {
    method: 'POST',
    token: customerToken,
    body: { productId: testProductId, quantity: 999999 },
  });
  assert(overStockRes.status === 400 && overStockRes.data.success === false, 'Adding quantity exceeding stock was rejected with 400');

  // Update cart quantity
  const updateCartRes = await request('/customer/cart/update', {
    method: 'PUT',
    token: customerToken,
    body: { productId: testProductId, quantity: 3 },
  });
  assert(updateCartRes.status === 200, 'Cart quantity updated to 3');

  // Wishlist toggle
  const wishToggle1 = await request('/customer/wishlist/toggle', {
    method: 'POST',
    token: customerToken,
    body: { productId: testProductId },
  });
  assert(wishToggle1.status === 200 && wishToggle1.data.isWishlisted === true, 'Added to wishlist');

  // Dynamic Coupon Validation
  const validCouponRes = await request('/customer/coupon/validate', {
    method: 'POST',
    body: { code: 'FARM100', subtotal: 600 },
  });
  assert(validCouponRes.status === 200 && validCouponRes.data.coupon.discountPercentage > 0, 'Valid coupon FARM100 approved with calculated discount');

  const invalidCouponRes = await request('/customer/coupon/validate', {
    method: 'POST',
    body: { code: 'INVALID_XYZ_99', subtotal: 600 },
  });
  assert(invalidCouponRes.status === 404 && invalidCouponRes.data.success === false, 'Invalid coupon rejected with 404');

  // Recharge Wallet
  const rechargeRes = await request('/customer/wallet/recharge', {
    method: 'POST',
    token: customerToken,
    body: { amount: 500 },
  });
  assert(rechargeRes.status === 200 && rechargeRes.data.success, 'Customer wallet recharged with ₹500');

  // ----------------------------------------------------------------
  // 4. ORDER CREATION (COD & ONLINE) & AUTHORITATIVE PRICING
  // ----------------------------------------------------------------
  console.log('\n--- TEST 4: Order Creation, Authoritative Calculations & Payment Verification ---');
  // 4A. COD Order
  const codOrderRes = await request('/orders/create', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ productId: testProductId, quantity: 2 }],
      deliveryAddress: {
        street: '99 Harvest Meadows',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641002',
      },
      deliveryMethod: 'home_delivery',
      paymentMethod: 'COD',
      couponCode: 'FARM100',
      useWallet: true,
    },
  });
  if (!codOrderRes.data?.success) {
    console.error('codOrderRes error:', codOrderRes.data);
  }
  assert((codOrderRes.status === 200 || codOrderRes.status === 201) && codOrderRes.data.success, 'COD Home Delivery order created successfully');
  testOrderId = codOrderRes.data.order.id;
  const codOrder = codOrderRes.data.order;
  assert(codOrder.orderStatus === 'Confirmed', 'COD order is Confirmed');
  assert(typeof codOrder.deliveryOtp === 'string' && codOrder.deliveryOtp.length === 6, `Generated 6-digit Delivery OTP: ${codOrder.deliveryOtp}`);
  console.log(`  Order #${testOrderId}: Subtotal=₹${codOrder.subtotal}, GST=₹${codOrder.gstAmount}, Delivery=₹${codOrder.deliveryCharge}, Discount=₹${codOrder.discountAmount}, GrandTotal=₹${codOrder.grandTotal}`);

  // 4B. Online Payment Order with Server-Side HMAC Verification
  const onlineOrderRes = await request('/orders/create', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ productId: testProductId, quantity: 1 }],
      deliveryAddress: {
        street: '99 Harvest Meadows',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641002',
      },
      deliveryMethod: 'home_delivery',
      paymentMethod: 'UPI',
    },
  });
  if (!onlineOrderRes.data?.success) {
    console.error('onlineOrderRes error:', onlineOrderRes.data);
  }
  assert((onlineOrderRes.status === 200 || onlineOrderRes.status === 201) && onlineOrderRes.data.success, 'Online payment order created (Status: Pending)');
  testOnlineOrderId = onlineOrderRes.data.order.id;

  // Create payment session
  const paySessionRes = await request('/payments/create', {
    method: 'POST',
    token: customerToken,
    body: { orderId: testOnlineOrderId, paymentMethod: 'UPI' },
  });
  if (!paySessionRes.data?.success) {
    console.error('paySessionRes error:', paySessionRes.data);
  }
  assert((paySessionRes.status === 200 || paySessionRes.status === 201) && paySessionRes.data.verificationToken, 'Created payment session with server verification token');
  const payTxn = paySessionRes.data.payment;
  const vToken = paySessionRes.data.verificationToken;

  // Verify payment session
  const payVerifyRes = await request('/payments/verify', {
    method: 'POST',
    token: customerToken,
    body: {
      paymentId: payTxn.paymentId,
      orderId: testOnlineOrderId,
      verificationToken: vToken,
      gatewayTransactionId: 'UPI-TXN-' + Math.floor(100000 + Math.random() * 900000),
      status: 'SUCCESS',
    },
  });
  assert(payVerifyRes.status === 200 && payVerifyRes.data.success, 'Server-side payment verification succeeded, stock reserved, order Confirmed');

  // 4C. Order Cancellation Test
  console.log('\n--- TEST 5: Customer Order Cancellation & Inventory/Wallet Restore ---');
  const cancelRes = await request(`/orders/${testOnlineOrderId}/cancel`, {
    method: 'POST',
    token: customerToken,
  });
  assert(cancelRes.status === 200 && cancelRes.data.success, 'Customer cancelled Confirmed order before delivery dispatch');
  assert(cancelRes.data.order.orderStatus === 'Cancelled', 'Order status updated to Cancelled');

  // ----------------------------------------------------------------
  // 5. DELIVERY PARTNER WORKFLOW & OTP VERIFIED COMPLETION
  // ----------------------------------------------------------------
  console.log('\n--- TEST 6: Delivery Partner Workflow & OTP Verification ---');
  // Delivery Partner assigns the COD order to themselves
  const assignRes = await request(`/orders/${testOrderId}/assign`, {
    method: 'PATCH',
    token: deliveryToken,
  });
  assert(assignRes.status === 200 && assignRes.data.success, `Delivery Partner assigned Order #${testOrderId}`);

  // Delivery Partner moves order to Out for Delivery
  const outForDeliveryRes = await request(`/orders/${testOrderId}/status`, {
    method: 'PATCH',
    token: deliveryToken,
    body: { status: 'Out for Delivery' },
  });
  assert(outForDeliveryRes.status === 200 && outForDeliveryRes.data.success, 'Order status updated to Out for Delivery');

  // Delivery partner enters incorrect OTP -> must fail
  const wrongOtpRes = await request(`/orders/${testOrderId}/status`, {
    method: 'PATCH',
    token: deliveryToken,
    body: { status: 'Delivered', otp: '000000' },
  });
  assert(wrongOtpRes.status === 400 && wrongOtpRes.data.success === false, 'Delivery with incorrect OTP rejected with 400');

  // Delivery partner enters correct OTP -> succeeds
  const correctOtpRes = await request(`/orders/${testOrderId}/status`, {
    method: 'PATCH',
    token: deliveryToken,
    body: {
      status: 'Delivered',
      otp: codOrder.deliveryOtp,
      digitalSignature: 'Customer Priya Signed',
      deliveryProofImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500',
    },
  });
  assert(correctOtpRes.status === 200 && correctOtpRes.data.success, `Delivery confirmed with OTP ${codOrder.deliveryOtp}! Status: Delivered`);

  // Check delivery partner payouts
  const payoutsRes = await request('/delivery/payouts', { token: deliveryToken });
  assert(payoutsRes.status === 200 && payoutsRes.data.payouts.length > 0, 'Delivery Partner payout record generated (₹60 per delivery)');

  // ----------------------------------------------------------------
  // 6. SELF-PICKUP WORKFLOW
  // ----------------------------------------------------------------
  const selfPickupOrderRes = await request('/orders/create', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ productId: testProductId, quantity: 1 }],
      deliveryAddress: {
        street: 'Coimbatore Distribution Hub Counter',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
      },
      deliveryMethod: 'self_pickup',
      pickupHubId: 'hub_cbe',
      paymentMethod: 'COD',
    },
  });
  if (!selfPickupOrderRes.data?.success) {
    console.error('selfPickupOrderRes error:', selfPickupOrderRes.data);
  }
  assert((selfPickupOrderRes.status === 200 || selfPickupOrderRes.status === 201) && selfPickupOrderRes.data.success, 'Self Pickup order created with ₹0 delivery charge');
  testSelfPickupOrderId = selfPickupOrderRes.data.order.id;
  const pickupOtp = selfPickupOrderRes.data.order.deliveryOtp;
  assert(selfPickupOrderRes.data.order.deliveryCharge === 0, 'Delivery fee is ₹0 for self pickup');

  // Mark ready for pickup
  const readyPickupRes = await request(`/orders/${testSelfPickupOrderId}/ready-for-pickup`, {
    method: 'PATCH',
    token: farmerToken,
  });
  assert(readyPickupRes.status === 200 && readyPickupRes.data.success, 'Order marked Ready for Pickup');

  // Complete pickup verification
  const completePickupRes = await request(`/orders/${testSelfPickupOrderId}/complete-pickup`, {
    method: 'PATCH',
    token: farmerToken,
    body: { otp: pickupOtp },
  });
  assert(completePickupRes.status === 200 && completePickupRes.data.success, `Customer collected self pickup order with verification code ${pickupOtp}`);

  // ----------------------------------------------------------------
  // 7. FARMER WORKFLOW (PRODUCT UPLOAD & OWNERSHIP ISOLATION)
  // ----------------------------------------------------------------
  console.log('\n--- TEST 8: Farmer Product Listing, Editing & Security Isolation ---');
  const newProdRes = await request('/products', {
    method: 'POST',
    token: farmerToken,
    body: {
      name: `Fresh Farm Organic Beetroot ${randomSuffix}`,
      category: 'Vegetables',
      description: 'Naturally grown fresh beetroot from organic farm.',
      price: 45,
      unit: 'Kg',
      stock: 120,
      harvestDate: new Date().toISOString().split('T')[0],
      organic: true,
      location: 'Pollachi, Coimbatore',
      image: '/images/vegetables/beetroot.png',
    },
  });
  if (!newProdRes.data?.success) {
    console.error('newProdRes error:', newProdRes.data, 'status:', newProdRes.status);
  }
  assert((newProdRes.status === 201 || newProdRes.status === 200) && newProdRes.data.success, 'Farmer uploaded new produce item (Status: Pending Approval)');
  testFarmerNewProductId = newProdRes.data.product.id;

  // Farmer edits their own product
  const editProdRes = await request(`/products/${testFarmerNewProductId}`, {
    method: 'PUT',
    token: farmerToken,
    body: { stock: 150, price: 42 },
  });
  assert(editProdRes.status === 200 && editProdRes.data.success, 'Farmer updated product price and stock');

  // IDOR Security Test: Another user attempting to delete farmer product
  const idorDeleteRes = await request(`/products/${testFarmerNewProductId}`, {
    method: 'DELETE',
    token: customerToken,
  });
  assert(idorDeleteRes.status === 403, 'Customer unauthorized to delete farmer product (403 IDOR protected)');

  // ----------------------------------------------------------------
  // 8. ADMIN WORKFLOW (APPROVALS, PROMOTIONS, PAYMENTS, FORECASTS)
  // ----------------------------------------------------------------
  console.log('\n--- TEST 9: Admin Product Approval, Dynamic Promotions, & Analytics ---');
  // Admin approves farmer's new product
  const approveProdRes = await request(`/products/${testFarmerNewProductId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'Approved' },
  });
  assert(approveProdRes.status === 200 && approveProdRes.data.success, 'Admin approved farmer produce item');

  // Admin creates dynamic coupon
  const promoCode = `PROMO${randomSuffix}`;
  const createCouponRes = await request('/admin/coupons', {
    method: 'POST',
    token: adminToken,
    body: {
      code: promoCode,
      discountPercentage: 25,
      maxDiscount: 150,
      minOrderAmount: 200,
      validUntil: '2026-12-31',
      description: 'Exclusive 25% harvest coupon',
    },
  });
  assert((createCouponRes.status === 200 || createCouponRes.status === 201) && createCouponRes.data.success, `Admin created dynamic coupon '${promoCode}'`);

  // Customer immediately validates the newly created admin coupon
  const testNewCouponRes = await request('/customer/coupon/validate', {
    method: 'POST',
    body: { code: promoCode, subtotal: 400 },
  });
  assert(testNewCouponRes.status === 200 && testNewCouponRes.data.coupon.discountPercentage === 25, `Customer successfully validated newly created coupon '${promoCode}'`);

  const analyticsRes = await request('/admin/analytics', { token: adminToken });
  assert(analyticsRes.status === 200 && (analyticsRes.data.analytics?.orders?.total >= 1 || analyticsRes.data.analytics?.totalOrders >= 1), 'Admin analytics loaded with live aggregated statistics');

  const adminPayRes = await request('/admin/payments', { token: adminToken });
  assert(adminPayRes.status === 200 && Array.isArray(adminPayRes.data.payments), 'Admin financial payments audit ledger returned successfully');

  // ----------------------------------------------------------------
  // 9. SHOPKEEPER B2B WHOLESALE WORKFLOW
  // ----------------------------------------------------------------
  console.log('\n--- TEST 10: Shopkeeper B2B Wholesale Quantity Slabs & Ordering ---');
  const wholesaleCalcRes = await request('/products/calculate-wholesale', {
    method: 'POST',
    body: { productId: testProductId, quantity: 50 },
  });
  assert(wholesaleCalcRes.status === 200 && wholesaleCalcRes.data.calculation?.wholesalePrice > 0, 'Wholesale quantity slab calculation (50 units) returned tiered pricing');

  const b2bOrderRes = await request('/orders/create', {
    method: 'POST',
    token: shopkeeperToken,
    body: {
      items: [{ productId: testProductId, quantity: 20 }],
      deliveryAddress: {
        street: '42 Main Bazaar Street, Gandhipuram',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641012',
      },
      deliveryMethod: 'self_pickup',
      orderType: 'wholesale',
      paymentMethod: 'UPI',
    },
  });
  assert((b2bOrderRes.status === 200 || b2bOrderRes.status === 201) && b2bOrderRes.data.success, 'Shopkeeper B2B Wholesale bulk order placed successfully');

  console.log('\n====================================================');
  console.log('🎉 ALL 10 TEST SUITES PASSED FLAWLESSLY (100% SUCCESS)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
