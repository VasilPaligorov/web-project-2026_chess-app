import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { requireAuth } from '../middleware/auth';

const router = Router();

const PROFILE_FIELDS = 'username elo peakElo wins losses draws createdAt';

// GET /api/users/leaderboard — top players by elo (defined before /:id to avoid pattern collision)
router.get('/leaderboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    const users = await User.find({}, PROFILE_FIELDS).sort({ elo: -1 }).limit(limit);
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/users/:id — public profile
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user id' });
      return;
    }
    const user = await User.findById(id, PROFILE_FIELDS);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/users/:id/games — recent finished games for that user
router.get('/:id/games', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user id' });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;
    const games = await Game.find({
      status: 'finished',
      $or: [{ whitePlayer: id }, { blackPlayer: id }],
    })
      .populate('whitePlayer', 'username elo')
      .populate('blackPlayer', 'username elo')
      .populate('winner', 'username elo')
      .sort({ finishedAt: -1 })
      .limit(limit);
    res.json({ success: true, data: games });
  } catch (err) {
    console.error('Get user games error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
