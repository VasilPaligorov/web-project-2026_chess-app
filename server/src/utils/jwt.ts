import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');

const EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN ?? '30m') as SignOptions['expiresIn'];

export interface JwtPayload {
  userId: string;
  exp: number;
  iat: number;
}

export const signToken = (payload: { userId: string }): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload;
