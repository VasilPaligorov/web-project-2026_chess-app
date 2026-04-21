import { BlacklistedToken } from '../models/BlacklistedToken';

export async function blacklistToken(token: string, expiresAt: Date) {
  await BlacklistedToken.create({ token, expiresAt });
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const found = await BlacklistedToken.exists({ token });
  return found !== null;
}
