import mongoose from 'mongoose';
import fs from 'fs';
import { Product } from '../backend/models/Product.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');
  
  const allProds = await Product.find({}).lean();
  console.log('Total products in MongoDB:', allProds.length);

  const catCounts: Record<string, number> = {};
  allProds.forEach((p: any) => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });
  console.log('MongoDB category counts:', catCounts);

  const coconuts = await Product.find({ name: /coconut/i }).lean();
  console.log('\nAll Coconut products in MongoDB (' + coconuts.length + '):');
  coconuts.forEach((p: any) => {
    console.log(`- ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Status: ${p.status}`);
  });

  const dataJson = JSON.parse(fs.readFileSync('./backend/data.json', 'utf8'));
  const jsonCoconuts = (dataJson.products || []).filter((p: any) => /coconut/i.test(p.name));
  console.log('\nAll Coconut products in data.json (' + jsonCoconuts.length + '):');
  jsonCoconuts.forEach((p: any) => {
    console.log(`- ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Status: ${p.status}`);
  });

  const fruits = await Product.find({ category: 'Fruits' }).lean();
  console.log('\nAll products in Fruits category (' + fruits.length + '):');
  fruits.forEach((f: any) => console.log(`- ${f.id} | ${f.name} | ${f.status}`));

  const prodsWithDesc = await Product.find({
    $or: [
      { name: /coconut/i },
      { description: /coconut/i }
    ]
  }).lean();
  console.log('\nTotal coconut in name or description in MongoDB:', prodsWithDesc.length);
  prodsWithDesc.forEach((p: any) => console.log(`- ${p.id} | ${p.name} | ${p.category}`));

  await mongoose.disconnect();
}

run();
