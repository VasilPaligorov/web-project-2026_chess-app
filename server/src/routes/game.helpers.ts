import { Types } from 'mongoose';

export const PUBLIC_USER_FIELDS = 'username elo';

export const activeOrWaitingGamesQuery = (userId: string) => ({
  status: { $in: ['waiting', 'active'] },
  $or: [{ whitePlayer: userId }, { blackPlayer: userId }],
});

export function parseObjectId(id: unknown): string | null {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) return null;
  return id;
}
