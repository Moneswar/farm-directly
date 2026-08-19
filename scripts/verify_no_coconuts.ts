import mongoose from 'mongoose';
import http from 'http';

function fetchApi(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('=== VERIFYING COCONUT REMOVAL ===\n');

  // 1. Check MongoDB directly
  await mongoose.connect('mongodb://127.0.0.1:27017/farm');
  const collections = await mongoose.connection.db!.listCollections().toArray();
  for (const col of collections) {
    const c = mongoose.connection.db!.collection(col.name);
    const count = await c.countDocuments({
      $or: [
        { name: /coconut/i },
        { productName: /coconut/i },
        { description: /coconut/i },
        { 'items.productName': /coconut/i }
      ]
    });
    console.log(`MongoDB Collection [${col.name}]: ${count} coconut matches`);
  }

  // 2. Check Fruits via API
  const fruitsRes = await fetchApi('/api/products?category=Fruits');
  const fruits = fruitsRes.products || [];
  const fruitsCoconuts = fruits.filter((p: any) => /coconut/i.test(p.name));
  console.log(`\nFruits API: ${fruits.length} products (Coconuts: ${fruitsCoconuts.length})`);

  // 3. Check Nuts & Dry Fruits via API
  const nutsRes = await fetchApi('/api/products?category=Nuts%20%26%20Dry%20Fruits');
  const nuts = nutsRes.products || [];
  const nutsCoconuts = nuts.filter((p: any) => /coconut/i.test(p.name));
  console.log(`Nuts & Dry Fruits API: ${nuts.length} products (Coconuts: ${nutsCoconuts.length})`);
  console.log('Nuts & Dry Fruits produce available:');
  nuts.forEach((n: any) => console.log(` - ${n.name} (₹${n.price})`));

  // 4. Check All products search
  const allRes = await fetchApi('/api/products');
  const allProds = allRes.products || [];
  const allCoconuts = allProds.filter((p: any) => /coconut/i.test(p.name) || /coconut/i.test(p.description || ''));
  console.log(`\nAll Products API: ${allProds.length} products (Coconuts: ${allCoconuts.length})`);

  // 5. Check Search "coconut"
  const searchRes = await fetchApi('/api/products?search=coconut');
  const searchProds = searchRes.products || [];
  console.log(`Search "coconut" API: ${searchProds.length} products`);

  await mongoose.disconnect();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify().catch(console.error);
