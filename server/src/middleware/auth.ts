import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { isBlacklisted } from '../utils/tokenBlacklist';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  if (await isBlacklisted(token)) {
    res.status(401).json({ success: false, message: 'Token has been invalidated' });
    return;
  }

  req.user = payload;
  next();
}
