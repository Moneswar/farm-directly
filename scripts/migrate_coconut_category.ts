import mongoose from 'mongoose';
import fs from 'fs';
import { Product } from '../backend/models/Product.js';

async function migrate() {
  console.log('--- Coconut Categorization Migration ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');

  // 1. Update in MongoDB
  const mongoBefore = await Product.find({ name: /coconut/i }).lean();
  console.log(`Found ${mongoBefore.length} Coconut products in MongoDB.`);

  const updateResult = await Product.updateMany(
    { name: /coconut/i },
    { $set: { category: 'Nuts & Dry Fruits' } }
  );
  console.log(`MongoDB update result: matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount}`);

  // 2. Update in backend/data.json
  const dataPath = 'e:/projects/backend/data.json';
  if (fs.existsSync(dataPath)) {
    const dataJson = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let dataModified = 0;
    if (Array.isArray(dataJson.products)) {
      dataJson.products.forEach((p: any) => {
        if (/coconut/i.test(p.name)) {
          p.category = 'Nuts & Dry Fruits';
          dataModified++;
        }
      });
    }
    fs.writeFileSync(dataPath, JSON.stringify(dataJson, null, 2), 'utf8');
    console.log(`Updated ${dataModified} Coconut products in backend/data.json.`);
  }

  // 3. Verification check
  const fruitsNow = await Product.find({ category: 'Fruits' }).lean();
  const coconutsInFruits = fruitsNow.filter((p: any) => /coconut/i.test(p.name));
  console.log(`\nVerification: Fruits category now has ${fruitsNow.length} products (Coconut products in Fruits: ${coconutsInFruits.length}).`);

  const nutsNow = await Product.find({ category: 'Nuts & Dry Fruits' }).lean();
  const coconutsInNuts = nutsNow.filter((p: any) => /coconut/i.test(p.name));
  console.log(`Verification: Nuts & Dry Fruits category now has ${nutsNow.length} products (Coconut products in Nuts: ${coconutsInNuts.length}).`);

  console.log('\nProducts currently in Fruits category:');
  fruitsNow.forEach((p: any) => console.log(`- ${p.id} | ${p.name}`));

  await mongoose.disconnect();
}

migrate();
