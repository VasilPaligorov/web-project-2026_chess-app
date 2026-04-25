import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { blacklistToken } from '../utils/tokenBlacklist';

const router = Router();

const toPublicUser = (user: InstanceType<typeof User>) => ({
  _id:       user._id.toString(),
  username:  user.username,
  email:     user.email,
  elo:       user.elo,
  createdAt: user.createdAt.toISOString(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ success: false, message: 'username, email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      res.status(409).json({ success: false, message: `That ${field} is already taken` });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ username, email, passwordHash });
    const token = signToken({ userId: String(user._id) });

    res.status(201).json({ success: true, data: { user: toPublicUser(user), token } });
  } catch (err: unknown) {
    // Duplicate key error from a race between concurrent registrations
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      res.status(409).json({ success: false, message: 'That email or username is already taken' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'email and password are required' });
      return;
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = signToken({ userId: String(user._id) });
    res.json({ success: true, data: { user: toPublicUser(user), token } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization!.match(/^Bearer\s+(\S+)$/i)![1];
    const expiresAt = new Date(req.user!.exp * 1000);
    await blacklistToken(token, expiresAt);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
