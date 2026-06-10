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
import { User, SocketEvents, GameResult } from '../../shared/types';
```

If the relative path feels noisy, add a path alias in each `tsconfig.json`:

```json
// in client/tsconfig.json and server/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

Then import as:

```ts
import { User } from '@shared/types';
```

## File structure

```
/shared
  types.ts     # All shared types — the only file you need to edit
  README.md
```

## Contents of types.ts

Below is the full reference for every type defined in this package.

---

### User

```ts
export interface User {
  _id: string;
  username: string;
  email: string;
  elo: number;
  createdAt: string;
}
```

Used by: auth pages (P1), profile/leaderboard (P4), game display (P3).

---

### Game

```ts
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameResult = 'white' | 'black' | 'draw' | null;

export interface Game {
  _id: string;
  whitePlayer: User;
  blackPlayer: User | null;
  status: GameStatus;
  fen: string;
  pgn: string;
  winner: User | null;
  result: GameResult;
  spectatorToken: string;
  createdAt: string;
  finishedAt: string | null;
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
  reason: 'checkmate' | 'resignation' | 'stalemate' | ...;
}

export interface GameStartPayload {
  game: Game;
}
```

---

### Socket event names

Centralising event name strings as a const enum prevents typos across the codebase.

```ts
export const SocketEvents = {
  GAME_JOIN:       'game:join',
  GAME_LEAVE:      'game:leave',
  GAME_START:      'game:start',
  GAME_OVER:       'game:over',
  MOVE_MAKE:       'move:make',
  MOVE_UPDATE:     'move:update',
  SPECTATOR_JOIN:  'spectator:join',
  SPECTATOR_LEAVE: 'spectator:leave',
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

### API response wrapper

A consistent shape for all REST responses.

```ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}
```

---

### Stats

```ts
export interface UserStats {
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}
```

Used by: profile and leaderboard pages (P4).

## Rules for editing this file

1. **Discuss before adding.** Any new type added here affects both the client and server. Check with the team before committing.
2. **Never add business logic.** This file is types only — no functions, no classes, no imports from node_modules.
3. **Keep it flat.** One file is intentional. If it gets very long, split into `user.types.ts`, `game.types.ts`, etc. — but only once the file exceeds ~200 lines.
4. **Bump both sides.** When you change an existing interface, update all usages in both `/client` and `/server` before pushing.