/**
 * User JWT auth middleware. Verifies token from Authorization: Bearer <token> (same secret as authController).
 * Sets req.userId when valid. Use requireUserAuth for protected routes.
 */

import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.ADMIN_JWT_SECRET ?? 'diet-app-secret-change-in-production';

export function requireUserAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Login required.' },
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded?.sub;
    if (userId && typeof userId === 'string') {
      req.userId = userId;
      return next();
    }
  } catch (err) {
    logger.warn('User JWT verify failed', { message: err?.message });
  }
  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session. Please log in again.' },
  });
}

/** Optional: set req.userId if valid token present, else req.userId remains undefined. */
export function optionalUserAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded?.sub;
    if (userId && typeof userId === 'string') req.userId = userId;
  } catch (_) {}
  next();
}
