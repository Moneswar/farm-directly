import jwt from 'jsonwebtoken';
import { UserRole } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'farmdirect_jwt_secret_key_2026';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};
