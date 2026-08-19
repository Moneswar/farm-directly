import { Router } from 'express';
import {
  createOrder,
  getOrders,
  assignDeliveryBoy,
  updateOrderStatus,
  calculateDeliveryPreview,
  markReadyForPickup,
  completePickup,
  cancelOrder,
  verifyDeliveryOtp,
} from '../controllers/orderController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.post('/calculate-delivery', calculateDeliveryPreview);
router.post('/create', authenticateToken, requireRole(['customer', 'shopkeeper']), createOrder);
router.get('/', authenticateToken, getOrders);
router.post('/:orderId/cancel', authenticateToken, cancelOrder);
router.patch('/:orderId/cancel', authenticateToken, cancelOrder);
router.patch('/:orderId/assign', authenticateToken, requireRole(['admin', 'delivery']), assignDeliveryBoy);
router.patch('/:orderId/status', authenticateToken, requireRole(['delivery', 'admin', 'farmer']), updateOrderStatus);
router.post('/:orderId/verify-delivery-otp', authenticateToken, requireRole(['delivery', 'admin']), verifyDeliveryOtp);
router.patch('/:orderId/ready-for-pickup', authenticateToken, requireRole(['admin', 'farmer']), markReadyForPickup);
router.patch('/:orderId/complete-pickup', authenticateToken, requireRole(['admin', 'farmer']), completePickup);

export default router;
