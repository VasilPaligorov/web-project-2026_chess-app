import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  createGame,
  listWaitingGames,
  getCurrentGames,
  getGameById,
  joinGame,
  cancelGame,
} from '../controllers/game.controller';
import { getSpectateGame } from '../controllers/spectator.controller';

const router = Router();

router.post('/',                requireAuth, asyncHandler(createGame));
router.get('/waiting',          requireAuth, asyncHandler(listWaitingGames));
router.get('/me/current',       requireAuth, asyncHandler(getCurrentGames));
router.get('/spectate/:token',               asyncHandler(getSpectateGame));
router.get('/:id',              requireAuth, asyncHandler(getGameById));
router.post('/:id/join',        requireAuth, asyncHandler(joinGame));
router.delete('/:id',           requireAuth, asyncHandler(cancelGame));

export default router;
