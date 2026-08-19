import { Response } from 'express';
import { db } from '../services/storage.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { INotification } from '../models/index.js';

/**
 * Dispatch Helper Function: Centralized Notification Dispatcher
 * Idempotency guard prevents duplicate notifications within 5 mins.
 * Non-fatal exception handling guarantees primary business flows never break.
 */
export function createNotification(params: {
  userId: string;
  role?: string;
  title: string;
  message: string;
  type: string;
  priority?: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  relatedEntityId?: string;
  relatedEntityType?: string;
}): INotification | null {
  try {
    if (!params.userId || !params.title || !params.message) return null;

    // DUPLICATE NOTIFICATION PREVENTION GUARD
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    const isDuplicate = db.notifications.some(
      (n) =>
        n.userId === params.userId &&
        n.title === params.title &&
        n.message === params.message &&
        n.relatedEntityId === params.relatedEntityId &&
        n.createdAt >= fiveMinsAgo
    );

    if (isDuplicate) return null;

    const notif: INotification = {
      id: 'NOTIF-' + Math.floor(10000 + Math.random() * 90000),
      userId: params.userId,
      role: params.role,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority || 'INFO',
      relatedEntityId: params.relatedEntityId,
      relatedEntityType: params.relatedEntityType,
      read: false,
      createdAt: new Date().toISOString(),
    };

    db.notifications.unshift(notif);
    db.saveData();
    return notif;
  } catch (err) {
    console.error('Notification creation non-fatal error:', err);
    return null;
  }
}

/**
 * Get Authenticated User Notifications (Role-Based Security Isolation)
 */
export const getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Role-Isolated Filter
    let userNotifs = db.notifications.filter((n) => {
      if (n.userId === userId) return true;
      if (n.userId === 'all') return true;
      if (userRole === 'admin' && (n.userId === 'admin' || n.userId === 'usr_admin' || n.role === 'admin')) return true;
      return false;
    });

    const unreadCount = userNotifs.filter((n) => !n.read).length;

    return res.json({
      success: true,
      count: userNotifs.length,
      unreadCount,
      notifications: userNotifs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark Single Notification as Read
 */
export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const notifIndex = db.notifications.findIndex((n) => n.id === id);
    if (notifIndex === -1) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const notif = db.notifications[notifIndex];

    // Ownership Verification
    if (notif.userId !== userId && notif.userId !== 'all' && !(userRole === 'admin' && (notif.userId === 'admin' || notif.userId === 'usr_admin'))) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this notification' });
    }

    notif.read = true;
    db.notifications[notifIndex] = notif;
    db.saveData();

    return res.json({ success: true, message: 'Notification marked as read', notification: notif });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark All Notifications as Read for Authenticated User
 */
export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let updatedCount = 0;
    db.notifications.forEach((n) => {
      if (!n.read && (n.userId === userId || n.userId === 'all' || (userRole === 'admin' && (n.userId === 'admin' || n.userId === 'usr_admin')))) {
        n.read = true;
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      db.saveData();
    }

    return res.json({ success: true, message: `Marked ${updatedCount} notification(s) as read` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
