export interface User {
  _id: string;
  username: string;
  email: string;
  elo: number;
  createdAt: string;
}

export interface PublicUser {
  _id: string;
  username: string;
  elo: number;
}

export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameResult = 'white' | 'black' | 'draw';

export interface Game {
  _id: string;
  whitePlayer: PublicUser;
  blackPlayer: PublicUser | null;
  status: GameStatus;
  result: GameResult | null;
  winner: PublicUser | null;
  fen: string;
  pgn: string;
  spectatorToken: string;
  drawOffer: { from: string } | null;
  disconnectedSince: { white: string | null; black: string | null };
  lastMoveAt: string;
  createdAt: string;
  finishedAt: string | null;
}
