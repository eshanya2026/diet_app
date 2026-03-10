/**
 * Admin auth routes: login, seed (first admin only).
 */

import { Router } from 'express';
import { login, seedAdmin } from '../controllers/adminAuthController.js';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', login);
adminAuthRouter.post('/seed', seedAdmin);
