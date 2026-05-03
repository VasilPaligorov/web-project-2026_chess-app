import { User } from '../models/User';

const K_FACTOR = 32;
const MIN_ELO = 100;

function expectedScore(myRating: number, oppRating: number): number {
  return 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
}

export interface EloUpdateResult {
  whiteDelta: number;
  blackDelta: number;
  whiteNew: number;
  blackNew: number;
}

type Result = 'white' | 'black' | 'draw';

function counterField(result: Result, side: 'white' | 'black'): 'wins' | 'losses' | 'draws' {
  if (result === 'draw') return 'draws';
  return result === side ? 'wins' : 'losses';
}

/**
 * Standard Elo with K=32. Updates both players' ratings, win/loss/draw counts,
 * and peak rating. Returns the per-side delta (or null if either user is missing).
 *
 * Uses findByIdAndUpdate with atomic operators so we never load+save a User
 * document (avoids running validators against the `select: false` passwordHash).
 *
 * Note: read-then-write — if two of a user's games finish in the same instant
 * the second computation uses a stale rating. Acceptable at school-project scale.
 */
export async function updateElo(
  whitePlayerId: string,
  blackPlayerId: string,
  result: Result,
): Promise<EloUpdateResult | null> {
  const [white, black] = await Promise.all([
    User.findById(whitePlayerId, 'elo').lean(),
    User.findById(blackPlayerId, 'elo').lean(),
  ]);
  if (!white || !black) return null;

  const whiteScore = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0;
  const blackScore = 1 - whiteScore;

  const whiteExpected = expectedScore(white.elo, black.elo);
  const blackExpected = expectedScore(black.elo, white.elo);

  const whiteDelta = Math.round(K_FACTOR * (whiteScore - whiteExpected));
  const blackDelta = Math.round(K_FACTOR * (blackScore - blackExpected));

  const whiteNew = Math.max(MIN_ELO, white.elo + whiteDelta);
  const blackNew = Math.max(MIN_ELO, black.elo + blackDelta);

  await Promise.all([
    User.findByIdAndUpdate(whitePlayerId, {
      $set: { elo: whiteNew },
      $max: { peakElo: whiteNew },
      $inc: { [counterField(result, 'white')]: 1 },
    }),
    User.findByIdAndUpdate(blackPlayerId, {
      $set: { elo: blackNew },
      $max: { peakElo: blackNew },
      $inc: { [counterField(result, 'black')]: 1 },
    }),
  ]);

  return { whiteDelta, blackDelta, whiteNew, blackNew };
}
