import { Router } from 'express';
import { createPaymentTransaction, verifyPaymentTransaction, retryOrderPayment } from '../controllers/paymentController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/create', createPaymentTransaction);
router.post('/verify', verifyPaymentTransaction);
router.post('/retry', retryOrderPayment);

export default router;
