import { Router } from 'express';
import {
  createProduct,
  getAllProducts,
  getFarmerProducts,
  getProductById,
  updateProduct,
  approveRejectProduct,
  deleteProduct,
  uploadProductImage,
  getWholesalePricePreview,
} from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.get('/', getAllProducts);
router.post('/calculate-wholesale', getWholesalePricePreview);
router.post('/', authenticateToken, requireRole(['farmer', 'admin']), createProduct);
router.post('/create', authenticateToken, requireRole(['farmer', 'admin']), createProduct);
router.get('/my-products', authenticateToken, requireRole(['farmer', 'admin']), getFarmerProducts);
router.get('/:id', getProductById);
router.put('/:id', authenticateToken, requireRole(['farmer', 'admin']), updateProduct);
router.delete('/:id', authenticateToken, requireRole(['farmer', 'admin']), deleteProduct);
router.patch('/:id/status', authenticateToken, requireRole(['admin']), approveRejectProduct);
router.patch('/:id/approval', authenticateToken, requireRole(['admin']), approveRejectProduct);
router.post(
  '/upload-image',
  authenticateToken,
  requireRole(['farmer', 'admin']),
  upload.single('image'),
  uploadProductImage
);

export default router;
