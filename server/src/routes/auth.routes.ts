import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { register, login, googleLogin, logout, getCurrentUser } from '../controllers/auth.controller';

const router = Router();

router.post('/register',              asyncHandler(register));
router.post('/login',                 asyncHandler(login));
router.post('/google',                asyncHandler(googleLogin));
router.post('/logout',  requireAuth,  asyncHandler(logout));
router.get('/me',       requireAuth,  asyncHandler(getCurrentUser));

export default router;
