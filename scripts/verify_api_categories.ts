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
  console.log('--- Verifying API Responses ---');
  
  // 1. Check Fruits category
  const fruitsRes = await fetchApi('/api/products?category=Fruits');
  const fruits = fruitsRes.products || [];
  const coconutInFruits = fruits.filter((p: any) => /coconut/i.test(p.name));
  console.log(`Fruits Category: Total ${fruits.length} products.`);
  console.log(`Coconuts in Fruits: ${coconutInFruits.length}`);
  if (coconutInFruits.length > 0) {
    console.error('ERROR: Coconuts found in Fruits category:', coconutInFruits.map((c: any) => c.name));
  } else {
    console.log('SUCCESS: Zero Coconut products found in Fruits category.');
  }

  // 2. Check Nuts & Dry Fruits category
  const nutsRes = await fetchApi('/api/products?category=Nuts%20%26%20Dry%20Fruits');
  const nuts = nutsRes.products || [];
  const coconutInNuts = nuts.filter((p: any) => /coconut/i.test(p.name));
  console.log(`\nNuts & Dry Fruits Category: Total ${nuts.length} products.`);
  console.log(`Coconuts in Nuts & Dry Fruits: ${coconutInNuts.length}`);

  // 3. Check All other categories
  const categories = [
    'Vegetables',
    'Leafy Greens',
    'Grains',
    'Pulses',
    'Spices',
    'Seeds',
    'Flowers',
    'Dairy'
  ];

  console.log('\n--- Checking Other Categories ---');
  for (const cat of categories) {
    const res = await fetchApi(`/api/products?category=${encodeURIComponent(cat)}`);
    const count = (res.products || []).length;
    console.log(`Category "${cat}": ${count} products (Status: ${count > 0 ? 'OK' : 'Empty'})`);
  }

  // 4. Check search for coconut
  console.log('\n--- Checking Search Functionality ---');
  const searchRes = await fetchApi('/api/products?search=coconut');
  const searchProds = searchRes.products || [];
  console.log(`Search for "coconut": Found ${searchProds.length} products.`);
  searchProds.forEach((p: any) => {
    console.log(`- ${p.name} (Category: ${p.category}, Status: ${p.status})`);
  });

  console.log('\n--- Verification Complete ---');
}

verify().catch(console.error);
