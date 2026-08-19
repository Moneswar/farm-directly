import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartQuantity,
  getWishlist,
  toggleWishlist,
  addReview,
  rechargeWallet,
  getWeatherAndCropSuggestions,
  validateCoupon,
  getActiveCoupons,
} from '../controllers/customerController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/weather', getWeatherAndCropSuggestions);
router.get('/coupons', getActiveCoupons);
router.post('/coupon/validate', validateCoupon);
router.post('/coupons/validate', validateCoupon);
router.get('/cart', authenticateToken, getCart);
router.post('/cart/add', authenticateToken, addToCart);
router.put('/cart/update', authenticateToken, updateCartQuantity);
router.get('/wishlist', authenticateToken, getWishlist);
router.post('/wishlist/toggle', authenticateToken, toggleWishlist);
router.post('/review', authenticateToken, addReview);
router.post('/reviews', authenticateToken, addReview);
router.post('/wallet/recharge', authenticateToken, rechargeWallet);

export default router;

