/**
 * Admin protected routes: dashboard, users, diet plans, login activity, analytics.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  getDashboardStats,
  getUsers,
  getUserById,
  deleteUser,
  getDietPlans,
  getLoginActivity,
  getAnalytics,
} from '../controllers/adminController.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get('/dashboard/stats', getDashboardStats);
adminRouter.get('/users', getUsers);
adminRouter.get('/users/:id', getUserById);
adminRouter.delete('/users/:id', deleteUser);
adminRouter.get('/diet-plans', getDietPlans);
adminRouter.get('/login-activity', getLoginActivity);
adminRouter.get('/analytics', getAnalytics);
