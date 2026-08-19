import mongoose from 'mongoose';
import { Product } from '../backend/models/Product.js';

const VALID_10_CATEGORIES = [
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

async function checkNonStandardCategories() {
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');
  
  const products = await Product.find({
    category: { $nin: VALID_10_CATEGORIES as any }
  }).lean();

  console.log(`Found ${products.length} products with non-standard categories:`);
  products.forEach((p: any) => {
    console.log(`- ID: ${p.id} | Name: "${p.name}" | Current Category: "${p.category}"`);
  });

  await mongoose.disconnect();
}

checkNonStandardCategories().catch(console.error);
