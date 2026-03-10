/**
 * Admin login and seed. JWT issued on successful login.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findAdminByEmail, createAdmin, countAdmins } from '../repositories/adminRepository.js';
import { getJwtSecret } from '../middleware/adminAuth.js';

const JWT_EXPIRY = process.env.ADMIN_JWT_EXPIRY ?? '7d';
const SALT_ROUNDS = 10;

export async function login(req, res) {
  try {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }
    const admin = await findAdminByEmail(email);
    if (!admin?.password_hash) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' },
      });
    }
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' },
      });
    }
    const secret = getJwtSecret();
    const token = jwt.sign({ email: admin.email, sub: String(admin._id) }, secret, { expiresIn: JWT_EXPIRY });
    return res.status(200).json({
      success: true,
      data: { token, email: admin.email },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed.' },
    });
  }
}

/**
 * Seed first admin (only when no admins exist). Body: { email, password }.
 */
export async function seedAdmin(req, res) {
  try {
    const count = await countAdmins();
    if (count > 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admins already exist. Use login.' },
      });
    }
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await createAdmin(email, hash);
    if (!admin) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to create admin.' },
      });
    }
    const secret = getJwtSecret();
    const token = jwt.sign({ email: admin.email, sub: String(admin._id) }, secret, { expiresIn: JWT_EXPIRY });
    return res.status(201).json({
      success: true,
      data: { token, email: admin.email, message: 'First admin created.' },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Seed failed.' },
    });
  }
}
