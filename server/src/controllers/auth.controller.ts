import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { verifyGoogleAccessToken } from '../utils/google';
import { blacklistToken } from '../services/tokenBlacklist.service';
import { getIO } from '../socket/io';

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000;

const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,24}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PASSWORD_MAX_LENGTH = 72;

const usernameBaseFromEmail = (email: string): string => {
  const base = email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, USERNAME_MAX_LENGTH);
  return base.length >= 3 ? base : `player${base}`.slice(0, USERNAME_MAX_LENGTH);
};

const generateUniqueUsername = async (email: string): Promise<string> => {
  const base = usernameBaseFromEmail(email);
  let candidate = base;
  for (let suffix = 2; await User.exists({ username: candidate }); suffix++) {
    const tail = String(suffix);
    candidate = base.slice(0, USERNAME_MAX_LENGTH - tail.length) + tail;
  }
  return candidate;
};

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
  const { username, email, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string'
      || !username || !email || !password) {
    res.status(400).json({ success: false, message: 'username, email and password are required' });
    return;
  }

  if (!USERNAME_PATTERN.test(username)) {
    res.status(400).json({
      success: false,
      message: 'Username must be 3-24 characters using only letters, digits, ".", "_" or "-"',
    });
    return;
  }

  if (!EMAIL_PATTERN.test(email)) {
    res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    return;
  }

  if (password.length < 6 || password.length > PASSWORD_MAX_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Password must be between 6 and ${PASSWORD_MAX_LENGTH} characters`,
    });
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
    if (isDuplicateKeyError(err)) {
      res.status(409).json({ success: false, message: 'That email or username is already taken' });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body ?? {};

  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
    res.status(400).json({ success: false, message: 'identifier and password are required' });
    return;
  }

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier },
    ],
  }).select('+passwordHash');

  if (!user || !user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: String(user._id) });
  res.json({ success: true, data: { user: toPublicUser(user), token } });
}

export async function googleLogin(req: Request, res: Response) {
  const { accessToken } = req.body ?? {};

  if (typeof accessToken !== 'string' || !accessToken) {
    res.status(400).json({ success: false, message: 'accessToken is required' });
    return;
  }

  let profile;
  try {
    profile = await verifyGoogleAccessToken(accessToken);
  } catch {
    res.status(401).json({ success: false, message: 'Invalid Google credential' });
    return;
  }

  if (!profile.emailVerified) {
    res.status(401).json({ success: false, message: 'Your Google email is not verified' });
    return;
  }

  let user = await User.findOne({ googleId: profile.googleId });

  if (!user) {
    user = await User.findOne({ email: profile.email });
  }

  for (let attempt = 0; !user && attempt < 3; attempt++) {
    try {
      user = await User.create({
        username: await generateUniqueUsername(profile.email),
        email: profile.email,
        googleId: profile.googleId,
      });
    } catch (err: unknown) {
      if (!isDuplicateKeyError(err)) throw err;
      user = await User.findOne({ email: profile.email });
      if (!user && attempt === 2) throw err;
    }
  }
  if (!user) {
    res.status(500).json({ success: false, message: 'Could not create account' });
    return;
  }

  if (!user.googleId) {
    user.googleId = profile.googleId;
    await user.save();
  }

  const token = signToken({ userId: String(user._id) });
  res.json({ success: true, data: { user: toPublicUser(user), token } });
}

export async function logout(req: Request, res: Response) {
  const token = req.headers.authorization!.match(/^Bearer\s+(\S+)$/i)![1];
  const expiresAt = new Date(req.user!.exp * 1000);
  await blacklistToken(token, expiresAt);
  getIO().in(`user:${req.user!.userId}`).disconnectSockets(true);
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
