import mongoose from 'mongoose';
import { Product } from '../backend/models/Product.js';
import { User } from '../backend/models/User.js';
import { DistributionHub } from '../backend/models/Hub.js';
import { connectMongoDB } from '../backend/config/db.js';
import { seededProducts } from '../backend/services/productsSeed.js';

const VALID_CATEGORIES = [
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

const VALID_ROLES = ['customer', 'farmer', 'delivery', 'admin', 'shopkeeper'];

async function runDatabaseIntegrityTest() {
  console.log('================================================================');
  console.log('🔍 FARMMARKET: COMPREHENSIVE DATABASE & DATA INTEGRITY TEST');
  console.log('================================================================\n');

  // 1. MONGODB CONNECTION
  console.log('--- 1. MongoDB Connection & Database Info ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');
  console.log('  ✓ MongoDB Connection State:', mongoose.connection.readyState === 1 ? 'Connected (State: 1)' : 'Not Connected');
  console.log('  ✓ Active Database Name:', mongoose.connection.name);
  
  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log('  ✓ Existing Collections in Database:', collections.map(c => c.name).join(', '));

  // 2. PRODUCT DATA INTEGRITY
  console.log('\n--- 2. Product Data & Validation ---');
  const products = await Product.find({}).lean();
  console.log(`  ✓ Total Products in Database: ${products.length}`);

  let missingFieldsCount = 0;
  let invalidPricesCount = 0;
  let negativeStockCount = 0;
  let invalidCategoriesCount = 0;
  const duplicateIdMap = new Map<string, number>();
  const duplicateNameMap = new Map<string, number>();

  for (const p of products) {
    // Check required fields
    if (!p.id || !p.name || !p.category || p.price === undefined || !p.unit) {
      missingFieldsCount++;
      console.warn(`    ⚠️ Missing required field on product: ID="${p.id}", Name="${p.name}"`);
    }

    // Check category validity
    if (!VALID_CATEGORIES.includes(p.category)) {
      invalidCategoriesCount++;
      console.error(`    ❌ Invalid Category on Product ID="${p.id}": "${p.category}"`);
    }

    // Check price
    if (p.price <= 0 || isNaN(p.price)) {
      invalidPricesCount++;
      console.error(`    ❌ Invalid Price on Product ID="${p.id}": ₹${p.price}`);
    }

    // Check stock
    if (p.stock < 0 || isNaN(p.stock)) {
      negativeStockCount++;
      console.error(`    ❌ Negative/Invalid Stock on Product ID="${p.id}": ${p.stock}`);
    }

    // Track duplicates
    duplicateIdMap.set(p.id, (duplicateIdMap.get(p.id) || 0) + 1);
    duplicateNameMap.set(p.name, (duplicateNameMap.get(p.name) || 0) + 1);
  }

  const duplicateIds = Array.from(duplicateIdMap.entries()).filter(([_, count]) => count > 1);
  const duplicateNames = Array.from(duplicateNameMap.entries()).filter(([_, count]) => count > 1);

  console.log(`  ✓ Missing Fields: ${missingFieldsCount}`);
  console.log(`  ✓ Invalid Prices: ${invalidPricesCount}`);
  console.log(`  ✓ Negative Stock: ${negativeStockCount}`);
  console.log(`  ✓ Invalid Categories: ${invalidCategoriesCount}`);
  console.log(`  ✓ Duplicate Product IDs: ${duplicateIds.length}`);
  if (duplicateIds.length > 0) {
    console.warn('    ⚠️ Duplicate IDs found:', duplicateIds);
  }

  // 3. CATEGORY DISTRIBUTION & COCONUT SCAN
  console.log('\n--- 3. Category Breakdown & Coconut Scan ---');
  for (const cat of VALID_CATEGORIES) {
    const prodsInCat = products.filter(p => p.category === cat);
    const approvedInCat = prodsInCat.filter(p => p.status === 'Approved');
    console.log(`  ✓ [${cat}]: ${prodsInCat.length} total (${approvedInCat.length} Approved)`);
  }

  const coconutProducts = products.filter(p => /coconut/i.test(p.name) || /coconut/i.test(p.description || ''));
  console.log(`\n  ✓ Coconuts in Products Collection: ${coconutProducts.length}`);
  if (coconutProducts.length > 0) {
    coconutProducts.forEach(c => console.log(`    - ID: ${c.id} | Name: "${c.name}" | Category: ${c.category} | Status: ${c.status}`));
  }

  // 4. USERS & PASSWORDS SECURITY
  console.log('\n--- 4. User Accounts & Password Security ---');
  const users = await User.find({}).lean();
  console.log(`  ✓ Total Users in Database: ${users.length}`);

  let invalidRolesCount = 0;
  let plaintextPasswordsCount = 0;
  const userEmailMap = new Map<string, number>();

  for (const u of users) {
    if (!VALID_ROLES.includes(u.role)) {
      invalidRolesCount++;
      console.error(`    ❌ Invalid User Role for "${u.email}": "${u.role}"`);
    }

    if (!u.passwordHash || !u.passwordHash.startsWith('$2')) {
      plaintextPasswordsCount++;
      console.error(`    ❌ Insecure / Plaintext Password detected for "${u.email}"`);
    }

    const emailNorm = (u.email || '').toLowerCase();
    userEmailMap.set(emailNorm, (userEmailMap.get(emailNorm) || 0) + 1);
  }

  const duplicateEmails = Array.from(userEmailMap.entries()).filter(([_, count]) => count > 1);
  console.log(`  ✓ Invalid User Roles: ${invalidRolesCount}`);
  console.log(`  ✓ Plaintext / Insecure Passwords: ${plaintextPasswordsCount}`);
  console.log(`  ✓ Duplicate User Emails: ${duplicateEmails.length}`);

  // Count by role
  VALID_ROLES.forEach(r => {
    const roleCount = users.filter(u => u.role === r).length;
    console.log(`    - Role [${r}]: ${roleCount} users`);
  });

  // 5. ORDERS & MATHEMATICAL ACCURACY
  console.log('\n--- 5. Orders Collection & Financial Accuracy ---');
  const OrdersCollection = mongoose.connection.collection('orders');
  const orders = await OrdersCollection.find({}).toArray();
  console.log(`  ✓ Total Orders in Database: ${orders.length}`);

  let invalidOrderMathCount = 0;
  let orphanedCustomerOrders = 0;
  let orphanedProductItems = 0;

  const validUserIds = new Set(users.map(u => u.id));
  const validProductIds = new Set(products.map(p => p.id));

  for (const ord of orders) {
    if (ord.customerId && !validUserIds.has(ord.customerId)) {
      orphanedCustomerOrders++;
    }

    let calculatedSubtotal = 0;
    for (const item of (ord.items || [])) {
      if (item.productId && !validProductIds.has(item.productId)) {
        orphanedProductItems++;
      }
      calculatedSubtotal += (item.price || 0) * (item.quantity || 0);
    }

    const gst = ord.gstAmount !== undefined ? ord.gstAmount : Math.round(calculatedSubtotal * 0.05 * 100) / 100;
    const delivery = ord.deliveryCharge || 0;
    const discount = ord.discountAmount || 0;
    const wallet = ord.walletAmountUsed !== undefined ? ord.walletAmountUsed : (ord.walletDeduction !== undefined ? ord.walletDeduction : (ord.paymentMethod === 'Wallet' ? calculatedSubtotal + gst + delivery - discount : 0));

    const expectedGrandTotal = Math.max(0, Math.round((calculatedSubtotal + gst + delivery - discount - wallet) * 100) / 100);
    const actualGrandTotal = Math.round((ord.grandTotal || 0) * 100) / 100;

    if (Math.abs(expectedGrandTotal - actualGrandTotal) > 1.0) {
      invalidOrderMathCount++;
      console.warn(`    ⚠️ Order #${ord.id} Math Discrepancy: Stored=${actualGrandTotal}, Calculated=${expectedGrandTotal}`);
    }
  }

  console.log(`  ✓ Orders with Math Discrepancies (> ₹1.0): ${invalidOrderMathCount}`);
  console.log(`  ✓ Orphaned Customer Orders: ${orphanedCustomerOrders}`);
  console.log(`  ✓ Orphaned Product Items: ${orphanedProductItems}`);

  // 6. DISTRIBUTION HUBS & INVENTORY
  console.log('\n--- 6. Distribution Hubs & Inventory ---');
  const hubs = await DistributionHub.find({}).lean();
  console.log(`  ✓ Total Distribution Hubs in Database: ${hubs.length}`);
  hubs.forEach(h => console.log(`    - [${h.id}] ${h.name} (${h.district}, ${h.state})`));

  // 7. SEEDING / INITIALIZATION IDEMPOTENCY TEST
  console.log('\n--- 7. Database Initialization Idempotency Test ---');
  const prodsBefore = await Product.countDocuments();
  const usersBefore = await User.countDocuments();
  const hubsBefore = await DistributionHub.countDocuments();

  console.log(`  Current counts -> Products: ${prodsBefore}, Users: ${usersBefore}, Hubs: ${hubsBefore}`);
  console.log('  Executing connectMongoDB() twice to simulate consecutive server restarts...');
  await connectMongoDB();
  await connectMongoDB();

  const prodsAfter = await Product.countDocuments();
  const usersAfter = await User.countDocuments();
  const hubsAfter = await DistributionHub.countDocuments();

  console.log(`  Post-sync counts -> Products: ${prodsAfter}, Users: ${usersAfter}, Hubs: ${hubsAfter}`);
  const isIdempotent = (prodsBefore === prodsAfter) && (usersBefore === usersAfter) && (hubsBefore === hubsAfter);
  console.log(`  ✓ Initialization Idempotency: ${isIdempotent ? 'PASS (100% Idempotent, zero duplicate records)' : 'FAIL'}`);

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 DATABASE & DATA INTEGRITY TEST COMPLETE');
  console.log('================================================================');
}

runDatabaseIntegrityTest().catch(console.error);
