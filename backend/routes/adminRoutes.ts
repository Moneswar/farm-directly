import { Router } from 'express';
import {
  getAdminAnalytics,
  getUsersList,
  updateUserStatus,
  getCoupons,
  createCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getOffers,
  createOffer,
  deleteOffer,
  updateDeliverySettings,
  getPricingConfig,
  updatePricingConfig,
  getAdminPayments,
} from '../controllers/adminController.js';
import {
  getAllHubs,
  getHubById,
  createHub,
  updateHub,
  toggleHubStatus,
  assignUserHub,
  getHubInventory,
  getInventoryMovements,
  receiveInventoryBatch,
  getFarmerCollections,
  assignCollectionDeliveryBoy,
  updateCollectionStatus,
  receiveCollectionAtHub,
  getHubTransfers,
  createHubTransfer,
  approveHubTransfer,
  dispatchHubTransfer,
  receiveHubTransfer,
  getReplenishmentRequests,
  createReplenishmentRequest,
  approveReplenishmentRequest,
  getDeliveryPayouts,
  approveDeliveryPayout,
  markDeliveryPayoutPaid,
} from '../controllers/hubController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import {
  getDemandForecasts,
  refreshDemandForecasts,
  acceptForecastRecommendation,
  ignoreForecastRecommendation,
} from '../controllers/forecastController.js';

const router = Router();

router.use(authenticateToken, requireRole(['admin']));

router.get('/analytics', getAdminAnalytics);
router.get('/users', getUsersList);
router.patch('/users/:userId/status', updateUserStatus);
router.put('/users/:userId/assign-hub', assignUserHub);

// AI Demand Forecasting & Smart Inventory Routes (Admin Only)
router.get('/forecasts', getDemandForecasts);
router.post('/forecasts/refresh', refreshDemandForecasts);
router.post('/forecasts/generate', refreshDemandForecasts);
router.post('/forecasts/:id/accept', acceptForecastRecommendation);
router.post('/forecasts/:id/ignore', ignoreForecastRecommendation);

// Delivery Partner Payout & Logistics Settlement Routes (Admin Only)
router.get('/payouts', getDeliveryPayouts);
router.patch('/payouts/:id/approve', approveDeliveryPayout);
router.patch('/payouts/:id/pay', markDeliveryPayoutPaid);


// Hub Stock Replenishment Routes (Admin Only)
router.get('/replenishments', getReplenishmentRequests);
router.post('/replenishments/create', createReplenishmentRequest);
router.patch('/replenishments/:id/approve', approveReplenishmentRequest);

// Inter-Hub Transfer Routes (Admin Only)
router.get('/transfers', getHubTransfers);
router.post('/transfers/create', createHubTransfer);

router.patch('/transfers/:id/approve', approveHubTransfer);
router.patch('/transfers/:id/dispatch', dispatchHubTransfer);
router.post('/transfers/:id/receive', receiveHubTransfer);

// Farmer Collection Routes (Admin Only)
router.get('/collections', getFarmerCollections);
router.put('/collections/:id/assign', assignCollectionDeliveryBoy);
router.patch('/collections/:id/status', updateCollectionStatus);
router.post('/hubs/:hubId/collections/:id/receive', receiveCollectionAtHub);


// Pricing & Logistics Configuration Routes (Admin Only)
router.get('/pricing-config', getPricingConfig);
router.put('/pricing-config', updatePricingConfig);

// Hub Inventory & Batch Management Routes (Admin Only)
router.get('/inventory', getHubInventory);
router.get('/inventory/movements', getInventoryMovements);
router.post('/hubs/:hubId/inventory/receive', receiveInventoryBatch);


// Distribution Hub Routes (Admin Only)
router.get('/hubs', getAllHubs);
router.get('/hubs/:id', getHubById);
router.post('/hubs', createHub);
router.put('/hubs/:id', updateHub);
router.patch('/hubs/:id/status', toggleHubStatus);


router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id/toggle', toggleCouponStatus);
router.delete('/coupons/:id', deleteCoupon);

router.get('/offers', getOffers);
router.post('/offers', createOffer);
router.delete('/offers/:id', deleteOffer);

router.get('/payments', getAdminPayments);
router.put('/settings', updateDeliverySettings);

export default router;
