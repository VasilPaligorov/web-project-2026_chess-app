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

export interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface MovePayload {
  gameId: string;
  move: Move;
}

export interface MoveUpdatePayload {
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  lastMove: Move;
}

export interface GameOverPayload {
  winner: 'white' | 'black' | 'draw';
  reason: 'checkmate' | 'resignation' | 'stalemate' | 'abandonment';
}

export const SocketEvents = {
  GAME_JOIN:      'game:join',
  GAME_START:     'game:start',
  GAME_OVER:      'game:over',
  MOVE_MAKE:      'move:make',
  MOVE_UPDATE:    'move:update',
  SPECTATOR_JOIN: 'spectator:join',
} as const;

export type SocketEvent = typeof SocketEvents[keyof typeof SocketEvents];
