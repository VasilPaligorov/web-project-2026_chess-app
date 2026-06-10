import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  getLeaderboard,
  getUserById,
  getUserGames,
  updatePassword,
  updateUsername,
} from '../controllers/user.controller';

const router = Router();

router.get('/leaderboard',   requireAuth, asyncHandler(getLeaderboard));
router.get('/:id',           requireAuth, asyncHandler(getUserById));
router.get('/:id/games',     requireAuth, asyncHandler(getUserGames));
router.patch('/:id',         requireAuth, asyncHandler(updateUsername));
router.patch('/:id/password', requireAuth, asyncHandler(updatePassword));

export default router;
