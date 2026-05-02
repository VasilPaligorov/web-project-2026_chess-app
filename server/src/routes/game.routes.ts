import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Game } from '../models/Game';
import { requireAuth } from '../middleware/auth';
import { getIO } from '../socket/io';

const router = Router();

const PUBLIC_USER_FIELDS = 'username elo';

const inGameQuery = (userId: string) => ({
  status: { $in: ['waiting', 'active'] },
  $or: [{ whitePlayer: userId }, { blackPlayer: userId }],
});

// POST /api/games — create a new waiting game
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const existing = await Game.exists(inGameQuery(userId));
    if (existing) {
      res.status(409).json({ success: false, message: 'You are already in a game' });
      return;
    }

    const game = await Game.create({ whitePlayer: userId });
    const populated = await game.populate('whitePlayer', PUBLIC_USER_FIELDS);
    getIO().emit('lobby:changed');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/games/waiting — list open games
router.get('/waiting', requireAuth, async (_req: Request, res: Response) => {
  try {
    const games = await Game.find({ status: 'waiting' })
      .populate('whitePlayer', PUBLIC_USER_FIELDS)
      .sort({ createdAt: -1 });
    res.json({ success: true, data: games });
  } catch (err) {
    console.error('List waiting games error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/games/me/current — the user's active or waiting game (for resume)
router.get('/me/current', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const game = await Game.findOne({
      status: { $in: ['waiting', 'active'] },
      $or: [{ whitePlayer: userId }, { blackPlayer: userId }],
    })
      .populate('whitePlayer', PUBLIC_USER_FIELDS)
      .populate('blackPlayer', PUBLIC_USER_FIELDS);
    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Get current game error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/games/spectate/:token — fetch game by spectator token (no auth)
router.get('/spectate/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const game = await Game.findOne({ spectatorToken: token })
      .populate('whitePlayer', PUBLIC_USER_FIELDS)
      .populate('blackPlayer', PUBLIC_USER_FIELDS)
      .populate('winner', PUBLIC_USER_FIELDS);
    if (!game) {
      res.status(404).json({ success: false, message: 'Game not found' });
      return;
    }
    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Spectate game fetch error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/games/:id — fetch single game (for rejoin / refresh)
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid game id' });
      return;
    }
    const game = await Game.findById(id)
      .populate('whitePlayer', PUBLIC_USER_FIELDS)
      .populate('blackPlayer', PUBLIC_USER_FIELDS)
      .populate('winner', PUBLIC_USER_FIELDS);
    if (!game) {
      res.status(404).json({ success: false, message: 'Game not found' });
      return;
    }
    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/games/:id/join — join a waiting game as black
router.post('/:id/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid game id' });
      return;
    }

    const existing = await Game.exists(inGameQuery(userId));
    if (existing) {
      res.status(409).json({ success: false, message: 'You are already in a game' });
      return;
    }

    const game = await Game.findOneAndUpdate(
      {
        _id: id,
        status: 'waiting',
        whitePlayer: { $ne: new Types.ObjectId(userId) },
      },
      { $set: { blackPlayer: userId, status: 'active', lastMoveAt: new Date() } },
      { new: true }
    )
      .populate('whitePlayer', PUBLIC_USER_FIELDS)
      .populate('blackPlayer', PUBLIC_USER_FIELDS);

    if (!game) {
      res.status(409).json({
        success: false,
        message: 'Game is not joinable (already started, missing, or your own)',
      });
      return;
    }

    const whiteId = String(game.whitePlayer._id);
    const blackId = String(game.blackPlayer!._id);
    const io = getIO();
    io.to([`user:${whiteId}`, `user:${blackId}`]).emit('game:start', game);
    io.emit('lobby:changed');

    res.json({ success: true, data: game });
  } catch (err) {
    console.error('Join game error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/games/:id — creator cancels their own waiting game
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid game id' });
      return;
    }

    const result = await Game.findOneAndDelete({
      _id: id,
      status: 'waiting',
      whitePlayer: userId,
    });

    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Waiting game not found or you are not the creator',
      });
      return;
    }

    getIO().emit('lobby:changed');
    res.json({ success: true, message: 'Game cancelled' });
  } catch (err) {
    console.error('Cancel game error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
