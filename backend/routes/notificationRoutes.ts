import { Router } from 'express';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, getUserNotifications);
router.patch('/read-all', authenticateToken, markAllNotificationsRead);
router.patch('/:id/read', authenticateToken, markNotificationRead);

export default router;
