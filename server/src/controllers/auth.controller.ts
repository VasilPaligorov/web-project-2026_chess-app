import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { blacklistToken } from '../utils/tokenBlacklist';

const toPublicUser = (user: InstanceType<typeof User>) => ({
  _id:       user._id.toString(),
  username:  user.username,
  email:     user.email,
  elo:       user.elo,
  peakElo:   user.peakElo,
  wins:      user.wins,
  losses:    user.losses,
  draws:     user.draws,
  createdAt: user.createdAt.toISOString(),
});

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ success: false, message: 'username, email and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
  if (existing) {
    const field = existing.email === normalizedEmail ? 'email' : 'username';
    res.status(409).json({ success: false, message: `That ${field} is already taken` });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await User.create({ username, email: normalizedEmail, passwordHash });
    const token = signToken({ userId: String(user._id) });

    res.status(201).json({ success: true, data: { user: toPublicUser(user), token } });
  } catch (err: unknown) {
    // Duplicate key error from a race between concurrent registrations
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      res.status(409).json({ success: false, message: 'That email or username is already taken' });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ success: false, message: 'identifier and password are required' });
    return;
  }

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier },
    ],
  }).select('+passwordHash');

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: String(user._id) });
  res.json({ success: true, data: { user: toPublicUser(user), token } });
}

export async function logout(req: Request, res: Response) {
  const token = req.headers.authorization!.match(/^Bearer\s+(\S+)$/i)![1];
  const expiresAt = new Date(req.user!.exp * 1000);
  await blacklistToken(token, expiresAt);
  res.json({ success: true, message: 'Logged out' });
}

export async function getCurrentUser(req: Request, res: Response) {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: { user: toPublicUser(user) } });
}
