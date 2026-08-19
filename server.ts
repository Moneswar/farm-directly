// Force reload server: 2026-08-19T22:48:30.000Z
import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
dotenv.config();

import { connectMongoDB } from './backend/config/db.js';
import { seededProducts } from './backend/services/productsSeed.js';
import authRoutes from './backend/routes/authRoutes.js';
import productRoutes from './backend/routes/productRoutes.js';
import orderRoutes from './backend/routes/orderRoutes.js';
import adminRoutes from './backend/routes/adminRoutes.js';
import customerRoutes from './backend/routes/customerRoutes.js';
import notificationRoutes from './backend/routes/notificationRoutes.js';
import paymentRoutes from './backend/routes/paymentRoutes.js';
import { getActiveHubs, getFarmerCollections, updateCollectionStatus, getDeliveryPayouts } from './backend/controllers/hubController.js';
import { authenticateToken, requireRole } from './backend/middlewares/auth.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize Local MongoDB connection
  await connectMongoDB();

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'backend', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  // Serve uploads and public assets statically
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }
  app.use('/uploads', express.static(uploadsDir));

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.get('/api/hubs/active', getActiveHubs);
  app.get('/api/collections', authenticateToken, requireRole(['farmer', 'admin']), getFarmerCollections);
  app.patch('/api/collections/:id/status', authenticateToken, requireRole(['farmer', 'delivery', 'admin']), updateCollectionStatus);
  app.get('/api/delivery/payouts', authenticateToken, requireRole(['delivery', 'admin']), getDeliveryPayouts);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'FarmDirect API Engine', version: '1.0.0', environment: process.env.NODE_ENV || 'production' });
  });

  // Determine whether to run Vite dev middleware or serve pre-built production dist
  const isDevMode = process.env.NODE_ENV === 'development';
  const distPath = path.join(process.cwd(), 'dist');
  const distExists = fs.existsSync(path.join(distPath, 'index.html'));

  if (isDevMode || !distExists) {
    console.log('⚡ Starting Vite Middleware for Development...');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('📦 Serving Static Frontend from dist...');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 FarmDirect Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
