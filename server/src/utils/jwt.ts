import jwt from 'jsonwebtoken';

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};

export interface JwtPayload {
  userId: string;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, secret(), { expiresIn: (process.env.JWT_EXPIRES_IN ?? '30m') as jwt.SignOptions['expiresIn'] });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, secret()) as JwtPayload;
