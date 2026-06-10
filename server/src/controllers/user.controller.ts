import { Request, Response } from 'express';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { parseObjectId } from './game.helpers';

const PROFILE_FIELDS = 'username elo peakElo wins losses draws createdAt';

export async function getLeaderboard(req: Request, res: Response) {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
  const users = await User.find({}, PROFILE_FIELDS).sort({ elo: -1 }).limit(limit);
  res.json({ success: true, data: users });
}

export async function getUserById(req: Request, res: Response) {
  const id = parseObjectId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid user id' });
    return;
  }
  const user = await User.findById(id, PROFILE_FIELDS);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
}

export async function getUserGames(req: Request, res: Response) {
  const id = parseObjectId(req.params.id);
  if (!id) {
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
}
