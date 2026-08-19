import { connectMongoDB } from '../backend/config/db.js';
import mongoose from 'mongoose';
import { Product } from '../backend/models/Product.js';

async function testRestart() {
  console.log('Simulating server startup...');
  await connectMongoDB();
  
  const coconuts = await Product.find({ name: /coconut/i }).lean();
  console.log('\nPost-startup Coconut count in MongoDB:', coconuts.length);
  if (coconuts.length === 0) {
    console.log('SUCCESS: Coconut products did NOT return upon server sync!');
  } else {
    console.error('FAILURE: Coconut products returned:', coconuts);
  }

  const nuts = await Product.find({ category: 'Nuts & Dry Fruits' }).lean();
  console.log('Nuts & Dry Fruits products count:', nuts.length);
  console.log('Nuts & Dry Fruits products:', nuts.map((n: any) => n.name).join(', '));

  await mongoose.disconnect();
}

testRestart();
