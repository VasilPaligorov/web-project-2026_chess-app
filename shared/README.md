# Chess App — Shared

A single TypeScript file containing all shared types, interfaces, and enums used by both the client and server. This folder has no dependencies and no build step — it is imported directly.

## Why this exists

Without a shared types layer, the client and server define their own versions of `User`, `Game`, and socket event payloads. They drift apart silently, and type errors only surface at runtime. This folder is the single source of truth.

## Usage

**From the server:**

```ts
import { Game, GameStatus, MovePayload } from '../../shared/types';
```

**From the client:**

```ts
import { User, SocketEvents, GameResult } from '../../../shared/types';
```

## File structure

```
/shared
  types.ts     # All shared types — the only file you need to edit
  README.md
```

## Contents of `types.ts`

Below is the full reference for every type defined in this package. Match the names exactly — the file is the source of truth, this README is a summary.

---

### User & auth

```ts
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
```

Used by: auth pages (P1), profile and leaderboard (P4), public listings (P2, P3).

---

### Game

```ts
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
```

Used by: lobby (P2), game board (P3), score tracking (P4), spectator (P5).

---

### Move

```ts
export interface Move {
  from: string;   // e.g. "e2"
  to: string;     // e.g. "e4"
  promotion?: 'q' | 'r' | 'b' | 'n';
}
```

Used by: game board (P3), spectator (P5).

---

### Socket event payloads

These types describe the data attached to every Socket.IO event. Both the server (when emitting) and the client (when listening) use the same interface.

```ts
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
```

---

### Chat

```ts
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
```

---

### Socket event names

Centralising event name strings as a const prevents typos across the codebase.

```ts
export const SocketEvents = {
  GAME_JOIN:       'game:join',
  GAME_LEAVE:      'game:leave',
  GAME_START:      'game:start',
  GAME_OVER:       'game:over',
  GAME_RESIGN:     'game:resign',
  MOVE_MAKE:       'move:make',
  MOVE_UPDATE:     'move:update',
  MOVE_ERROR:      'move:error',
  DRAW_OFFER:      'draw:offer',
  DRAW_ACCEPT:     'draw:accept',
  DRAW_DECLINE:    'draw:decline',
  DRAW_DECLINED:   'draw:declined',
  SPECTATOR_JOIN:  'spectator:join',
  SPECTATOR_LEAVE: 'spectator:leave',
  CHAT_SEND:       'chat:send',
  CHAT_RECEIVE:    'chat:receive',
  CHAT_HISTORY:    'chat:history',
  LOBBY_CHANGED:   'lobby:changed',
} as const;

export type SocketEvent = typeof SocketEvents[keyof typeof SocketEvents];
```

Usage on the server:

```ts
import { SocketEvents, MoveUpdatePayload } from '../../shared/types';

io.to(`game:${gameId}`).emit(SocketEvents.MOVE_UPDATE, payload);
```

Usage on the client:

```ts
socket.on(SocketEvents.MOVE_UPDATE, (data: MoveUpdatePayload) => {
  setFen(data.fen);
});
```

---

## Rules for editing `types.ts`

1. **Discuss before adding.** Any new type added here affects both the client and server. Check with the team before committing.
2. **Never add business logic.** This file is types only — no functions, no classes, no imports from `node_modules`.
3. **Keep it flat.** One file is intentional. If it gets very long, split into `user.types.ts`, `game.types.ts`, etc. — but only once the file exceeds ~300 lines.
4. **Bump both sides.** When you change an existing interface, update all usages in both `/client` and `/server` before pushing.
