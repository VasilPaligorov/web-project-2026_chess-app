import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  createGame,
  listWaitingGames,
  getCurrentGame,
  getSpectateGame,
  getGameById,
  joinGame,
  cancelGame,
} from './game.controllers';

const router = Router();

router.post('/',                requireAuth, asyncHandler(createGame));
router.get('/waiting',          requireAuth, asyncHandler(listWaitingGames));
router.get('/me/current',       requireAuth, asyncHandler(getCurrentGame));
router.get('/spectate/:token',               asyncHandler(getSpectateGame));
router.get('/:id',              requireAuth, asyncHandler(getGameById));
router.post('/:id/join',        requireAuth, asyncHandler(joinGame));
router.delete('/:id',           requireAuth, asyncHandler(cancelGame));

export default router;
