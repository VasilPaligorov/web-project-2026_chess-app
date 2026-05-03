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
  endReason: GameOverPayload['reason'] | null;
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
  reason:
  | 'checkmate'
  | 'resignation'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'agreement'
  | 'abandonment';
}

export interface MoveErrorPayload {
  message: string;
}

export interface DrawOfferPayload {
  from: 'white' | 'black';
}

export interface DisconnectPayload {
  color: 'white' | 'black';
  since: string;
}

export interface ReconnectPayload {
  color: 'white' | 'black';
}

export const SocketEvents = {
  GAME_JOIN: 'game:join',
  GAME_LEAVE: 'game:leave',
  GAME_START: 'game:start',
  GAME_OVER: 'game:over',
  GAME_RESIGN: 'game:resign',
  GAME_DISCONNECT: 'game:disconnect',
  GAME_RECONNECT: 'game:reconnect',
  GAME_CLAIM_WIN: 'game:claim-win',
  GAME_CLAIM_ERROR: 'game:claim-error',
  MOVE_MAKE: 'move:make',
  MOVE_UPDATE: 'move:update',
  MOVE_ERROR: 'move:error',
  DRAW_OFFER: 'draw:offer',
  DRAW_ACCEPT: 'draw:accept',
  DRAW_DECLINE: 'draw:decline',
  DRAW_DECLINED: 'draw:declined',
  SPECTATOR_JOIN: 'spectator:join',
} as const;

export type SocketEvent = typeof SocketEvents[keyof typeof SocketEvents];
