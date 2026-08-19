import mongoose from 'mongoose';
import fs from 'fs';
import { Product } from '../backend/models/Product.js';

async function updateHoneyCategory() {
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');
  
  const res = await Product.updateMany(
    { category: 'Honey' },
    { $set: { category: 'Dairy' } }
  );
  console.log(`Updated ${res.modifiedCount} products in MongoDB from 'Honey' to 'Dairy'.`);

  // Update in backend/data.json
  const dataPath = 'e:/projects/backend/data.json';
  if (fs.existsSync(dataPath)) {
    const dataJson = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let dataModified = 0;
    (dataJson.products || []).forEach((p: any) => {
      if (p.category === 'Honey') {
        p.category = 'Dairy';
        dataModified++;
      }
    });
    if (dataModified > 0) {
      fs.writeFileSync(dataPath, JSON.stringify(dataJson, null, 2), 'utf8');
      console.log(`Updated ${dataModified} products in backend/data.json from 'Honey' to 'Dairy'.`);
    }
  }

  await mongoose.disconnect();
}

updateHoneyCategory().catch(console.error);
