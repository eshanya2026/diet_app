/**
 * User auth routes: register, login, getMe, updateProfile, changePassword.
 */

import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { requireUserAuth } from '../middleware/userAuth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireUserAuth, getMe);
authRouter.patch('/me', requireUserAuth, updateProfile);
authRouter.post('/me/change-password', requireUserAuth, changePassword);
