import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';

const router = Router();

const toPublicUser = (user: InstanceType<typeof User>) => ({
  _id:       user._id,
  username:  user.username,
  email:     user.email,
  elo:       user.elo,
  createdAt: user.createdAt,
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
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
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'email and password are required' });
    return;
  }

  const user = await User.findOne({ email });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: String(user._id) });
  res.json({ success: true, data: { user: toPublicUser(user), token } });
});

export default router;
