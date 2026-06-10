export interface User {
  _id: string;
  username: string;
  email: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: { user: User; token: string };
}

export interface PublicUser {
  _id: string;
  username: string;
  elo: number;
}

export interface UserStats {
  _id: string;
  username: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
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
  gameId: string;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  lastMove: Move;
}

export interface GameOverPayload {
  gameId: string;
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
  gameId: string;
  message: string;
}

export interface DrawOfferPayload {
  gameId: string;
  from: 'white' | 'black';
}

export interface DrawDeclinedPayload {
  gameId: string;
}

export const MAX_CHAT_MESSAGE_LENGTH = 200;

export interface ChatSendPayload {
  gameId: string;
  text: string;
}

export interface ChatMessagePayload {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface ChatHistoryPayload {
  gameId: string;
  messages: ChatMessagePayload[];
}

export const SocketEvents = {
  GAME_JOIN:      'game:join',
  GAME_LEAVE:     'game:leave',
  GAME_START:     'game:start',
  GAME_OVER:      'game:over',
  GAME_RESIGN:    'game:resign',
  MOVE_MAKE:      'move:make',
  MOVE_UPDATE:    'move:update',
  MOVE_ERROR:     'move:error',
  DRAW_OFFER:     'draw:offer',
  DRAW_ACCEPT:    'draw:accept',
  DRAW_DECLINE:   'draw:decline',
  DRAW_DECLINED:  'draw:declined',
  SPECTATOR_JOIN:  'spectator:join',
  SPECTATOR_LEAVE: 'spectator:leave',
  CHAT_SEND:      'chat:send',
  CHAT_RECEIVE:   'chat:receive',
  CHAT_HISTORY:   'chat:history',
  LOBBY_CHANGED:  'lobby:changed',
} as const;

export type SocketEvent = typeof SocketEvents[keyof typeof SocketEvents];