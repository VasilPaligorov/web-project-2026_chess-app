import { Request, Response } from 'express';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { parseObjectId } from './game.helpers';
import { comparePassword, hashPassword } from '../utils/password';

const PROFILE_FIELDS = 'username elo peakElo wins losses draws createdAt';

const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;

function isOwner(req: Request, id: string): boolean {
  return req.user?.userId === id;
}

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

export async function updateUsername(req: Request, res: Response) {
  const id = parseObjectId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid user id' });
    return;
  }
  if (!isOwner(req, id)) {
    res.status(403).json({ success: false, message: 'You can only edit your own profile' });
    return;
  }

  const raw = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (raw.length < USERNAME_MIN || raw.length > USERNAME_MAX) {
    res.status(400).json({
      success: false,
      message: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`,
    });
    return;
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { username: raw } },
      { new: true, runValidators: true, projection: PROFILE_FIELDS },
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, message: 'Username already taken' });
      return;
    }
    throw err;
  }
}

export async function updatePassword(req: Request, res: Response) {
  const id = parseObjectId(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid user id' });
    return;
  }
  if (!isOwner(req, id)) {
    res.status(403).json({ success: false, message: 'You can only edit your own profile' });
    return;
  }

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (newPassword.length < PASSWORD_MIN) {
    res.status(400).json({
      success: false,
      message: `New password must be at least ${PASSWORD_MIN} characters`,
    });
    return;
  }

  const user = await User.findById(id).select('+passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  if (!user.passwordHash) {
    res.status(400).json({
      success: false,
      message: 'This account has no password — sign in via Google',
    });
    return;
  }

  const ok = await comparePassword(currentPassword, user.passwordHash);
  if (!ok) {
    res.status(401).json({ success: false, message: 'Current password is incorrect' });
    return;
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.json({ success: true });
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
