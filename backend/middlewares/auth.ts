import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { db } from '../services/storage.js';
import { UserRole } from '../models/index.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
  }

  // Check if user is blocked in DB
  const user = db.users.find((u) => u.id === payload.id);
  if (user && user.status === 'blocked') {
    return res.status(403).json({ success: false, message: 'Your account has been blocked by administrator.' });
  }

  req.user = payload;
  next();
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource. Required: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};
