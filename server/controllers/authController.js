/**
 * User auth: register, login, getMe, updateProfile, changePassword.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUserWithAuth, findUserById, updateAuthUserById } from '../repositories/userRepository.js';
import { createLoginLog } from '../repositories/loginLogRepository.js';

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.ADMIN_JWT_SECRET ?? 'diet-app-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? '7d';
const SALT_ROUNDS = 10;

function getClientIp(req) {
  return req.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.ip ?? req.socket?.remoteAddress ?? '';
}

function getDeviceInfo(req) {
  return req.get('user-agent') ?? '';
}

export async function register(req, res) {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const name = String(req.body?.name ?? '').trim();
    if (!email || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUserWithAuth({
      email,
      password_hash: hash,
      name: name || email.split('@')[0],
    });
    if (!user) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Email already registered.' },
      });
    }
    return res.status(201).json({
      success: true,
      data: {
        id: user._id?.toString(),
        email: user.email,
        name: user.name ?? '',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Registration failed.' },
    });
  }
}

export async function login(req, res) {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }
    const user = await findUserByEmail(email);
    if (!user?.password_hash) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' },
      });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' },
      });
    }
    await createLoginLog({
      user_id: user._id,
      email: user.email ?? email,
      login_time: new Date(),
      ip_address: getClientIp(req),
      device_info: getDeviceInfo(req),
    });
    const token = jwt.sign(
      { sub: user._id?.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id?.toString(),
          email: user.email,
          name: user.name ?? '',
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed.' },
    });
  }
}

export async function getMe(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Login required.' },
      });
    }
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        id: user._id?.toString(),
        email: user.email ?? '',
        name: user.name ?? '',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load profile.' },
    });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.userId;
    const name = String(req.body?.name ?? '').trim();
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Login required.' },
      });
    }
    const updated = await updateAuthUserById(userId, { name });
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found or cannot update.' },
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        id: updated._id?.toString(),
        email: updated.email ?? '',
        name: updated.name ?? '',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update profile.' },
    });
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.userId;
    const currentPassword = String(req.body?.current_password ?? '');
    const newPassword = String(req.body?.new_password ?? '');
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Login required.' },
      });
    }
    if (!currentPassword || !newPassword) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Current password and new password are required.' },
      });
    }
    if (newPassword.length < 6) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters.' },
      });
    }
    const user = await findUserById(userId);
    if (!user?.password_hash) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found or has no password.' },
      });
    }
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect.' },
      });
    }
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updated = await updateAuthUserById(userId, { password_hash: hash });
    if (!updated) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to update password.' },
      });
    }
    return res.status(200).json({
      success: true,
      data: { message: 'Password updated.' },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to change password.' },
    });
  }
}
