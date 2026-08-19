import mongoose from 'mongoose';
import fs from 'fs';
import { Product } from '../backend/models/Product.js';
import { DistributionHub } from '../backend/models/Hub.js';

async function cleanup() {
  console.log('=== REMOVING ALL COCONUT PRODUCTS ===\n');

  // 1. Connect to MongoDB
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');

  // 2. Find all coconut products in MongoDB
  const mongoCoconuts = await Product.find({
    $or: [
      { name: /coconut/i },
      { description: /coconut/i },
      { id: /coconut/i }
    ]
  }).lean();

  console.log(`Found ${mongoCoconuts.length} Coconut products in MongoDB:`);
  mongoCoconuts.forEach((p: any) => console.log(` - ID: ${p.id} | Name: "${p.name}" | Category: ${p.category}`));

  const coconutIds = mongoCoconuts.map((p: any) => p.id);

  // 3. Delete from MongoDB Product collection
  const deleteResult = await Product.deleteMany({
    $or: [
      { name: /coconut/i },
      { description: /coconut/i },
      { id: /coconut/i },
      { id: { $in: coconutIds } }
    ]
  });
  console.log(`\nMongoDB products deleted: ${deleteResult.deletedCount}`);

  // Also clean up associated collections in MongoDB if they exist
  try {
    const HubInventory = mongoose.connection.collection('hubinventories');
    if (HubInventory) {
      const invDel = await HubInventory.deleteMany({
        $or: [
          { productId: { $in: coconutIds } },
          { productName: /coconut/i }
        ]
      });
      console.log(`MongoDB HubInventory deleted: ${invDel.deletedCount}`);
    }
  } catch (err: any) {
    console.log('HubInventory cleanup note:', err.message);
  }

  try {
    const InvMovements = mongoose.connection.collection('inventorymovements');
    if (InvMovements) {
      const movDel = await InvMovements.deleteMany({
        $or: [
          { productId: { $in: coconutIds } },
          { notes: /coconut/i }
        ]
      });
      console.log(`MongoDB InventoryMovements deleted: ${movDel.deletedCount}`);
    }
  } catch (err: any) {
    console.log('InventoryMovements cleanup note:', err.message);
  }

  try {
    const FarmerColl = mongoose.connection.collection('farmercollections');
    if (FarmerColl) {
      const collDel = await FarmerColl.deleteMany({
        $or: [
          { productId: { $in: coconutIds } },
          { productName: /coconut/i }
        ]
      });
      console.log(`MongoDB FarmerCollections deleted: ${collDel.deletedCount}`);
    }
  } catch (err: any) {
    console.log('FarmerCollections cleanup note:', err.message);
  }

  try {
    const Orders = mongoose.connection.collection('orders');
    if (Orders) {
      const ordDel = await Orders.deleteMany({
        $or: [
          { 'items.productName': /coconut/i },
          { 'items.productId': { $in: coconutIds } }
        ]
      });
      console.log(`MongoDB Orders deleted: ${ordDel.deletedCount}`);
    }
  } catch (err: any) {
    console.log('Orders cleanup note:', err.message);
  }

  // 4. Clean backend/data.json
  const dataPath = 'e:/projects/backend/data.json';
  if (fs.existsSync(dataPath)) {
    const dataJson = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    const origProds = (dataJson.products || []).length;
    dataJson.products = (dataJson.products || []).filter(
      (p: any) => !/coconut/i.test(p.name) && !/coconut/i.test(p.description || '') && !/coconut/i.test(p.id)
    );
    const deletedDataProds = origProds - dataJson.products.length;
    console.log(`\nbackend/data.json products removed: ${deletedDataProds} (Remaining: ${dataJson.products.length})`);

    // Clean inventory in data.json
    if (Array.isArray(dataJson.inventory)) {
      const origInv = dataJson.inventory.length;
      dataJson.inventory = dataJson.inventory.filter(
        (inv: any) => !/coconut/i.test(inv.productName || '') && !coconutIds.includes(inv.productId)
      );
      console.log(`backend/data.json inventory removed: ${origInv - dataJson.inventory.length}`);
    }

    // Clean inventory movements in data.json
    if (Array.isArray(dataJson.inventoryMovements)) {
      const origMov = dataJson.inventoryMovements.length;
      dataJson.inventoryMovements = dataJson.inventoryMovements.filter(
        (m: any) => !coconutIds.includes(m.productId) && !/coconut/i.test(m.notes || '')
      );
      console.log(`backend/data.json inventoryMovements removed: ${origMov - dataJson.inventoryMovements.length}`);
    }

    // Clean notifications in data.json
    if (Array.isArray(dataJson.notifications)) {
      const origNotif = dataJson.notifications.length;
      dataJson.notifications = dataJson.notifications.filter(
        (n: any) => !/coconut/i.test(n.message || '') && !/coconut/i.test(n.title || '')
      );
      console.log(`backend/data.json notifications removed: ${origNotif - dataJson.notifications.length}`);
    }

    fs.writeFileSync(dataPath, JSON.stringify(dataJson, null, 2), 'utf8');
    console.log('Saved updated backend/data.json.');
  }

  // 5. Verification checks
  console.log('\n--- VERIFICATION AFTER CLEANUP ---');

  const totalProds = await Product.countDocuments();
  console.log(`Total products in MongoDB now: ${totalProds}`);

  const anyCoconutsInDb = await Product.find({
    $or: [
      { name: /coconut/i },
      { description: /coconut/i }
    ]
  }).lean();
  console.log(`Coconut products remaining in MongoDB: ${anyCoconutsInDb.length}`);

  const fruits = await Product.find({ category: 'Fruits' }).lean();
  console.log(`Fruits count in MongoDB: ${fruits.length}`);
  const fruitCoconuts = fruits.filter((p: any) => /coconut/i.test(p.name));
  console.log(`Coconut in Fruits: ${fruitCoconuts.length}`);

  const nuts = await Product.find({ category: 'Nuts & Dry Fruits' }).lean();
  console.log(`Nuts & Dry Fruits count in MongoDB: ${nuts.length}`);
  const nutsCoconuts = nuts.filter((p: any) => /coconut/i.test(p.name));
  console.log(`Coconut in Nuts & Dry Fruits: ${nutsCoconuts.length}`);
  console.log('Nuts & Dry Fruits products:');
  nuts.forEach((n: any) => console.log(` - ${n.name} (Price: ₹${n.price}, Status: ${n.status})`));

  await mongoose.disconnect();
  console.log('\n=== CLEANUP COMPLETED SUCCESSFULLY ===');
}

cleanup().catch(console.error);
