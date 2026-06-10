import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { getLeaderboard, getUserById, getUserGames } from '../controllers/user.controller';

const router = Router();

router.get('/leaderboard', requireAuth, asyncHandler(getLeaderboard));
router.get('/:id',         requireAuth, asyncHandler(getUserById));
router.get('/:id/games',   requireAuth, asyncHandler(getUserGames));

export default router;
