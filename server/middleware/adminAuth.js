/**
 * Admin JWT auth middleware. Protects /api/admin/* routes.
 */

import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'diet-admin-secret-change-in-production';

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Admin token required.' },
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.email) {
      req.admin = { email: decoded.email };
      return next();
    }
  } catch (err) {
    logger.warn('Admin JWT verify failed', { message: err?.message });
  }
  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Invalid or expired admin token.' },
  });
}

export function getJwtSecret() {
  return process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'diet-admin-secret-change-in-production';
}
