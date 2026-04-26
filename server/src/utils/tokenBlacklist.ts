import { createHash } from 'crypto';
import { BlacklistedToken } from '../models/BlacklistedToken';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export async function blacklistToken(token: string, expiresAt: Date) {
  await BlacklistedToken.create({ tokenHash: hashToken(token), expiresAt });
}

export async function isBlacklisted(token: string): Promise<boolean> {
  return (await BlacklistedToken.exists({ tokenHash: hashToken(token) })) !== null;
}
