# Chess App — Server

The Node.js + Express + TypeScript backend for the Head-to-Head Chess application. Handles authentication, game logic, real-time communication via Socket.IO, and all database interactions through Mongoose.

## Tech stack

- **Node.js** with TypeScript (`ts-node-dev` for dev, compiled JS for production)
- **Express** — REST API
- **Socket.IO** — real-time bidirectional events (moves, game start, spectators)
- **Mongoose** — MongoDB ODM
- **chess.js** — server-side move validation and FEN/PGN management
- **jsonwebtoken** — JWT creation and verification
- **bcrypt** — password hashing
- **dotenv** — environment configuration

## Getting started

Install dependencies from the project root (recommended):

```bash
# from /chess-app root
npm run install:all
```

Or install just the server:

```bash
cd server
npm install
```

Start in development mode (with hot reload):

```bash
npm run dev
```

The server runs on `http://localhost:3000` by default.

## Prerequisites

- **MongoDB** running locally on `mongodb://localhost:27017` (or provide a Atlas connection string in `.env`)
- Node.js 18+

## Environment variables

Create a `.env` file in `/server`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chess-app
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Never commit `.env` to git — it is already listed in `.gitignore`.

## Folder structure

```
/server
  /src
    /config
      db.ts             # Mongoose connection
    /middleware
      auth.ts           # JWT verification middleware
      errorHandler.ts   # Global error handler
    /models             # Mongoose schemas
      User.ts           # P1
      Game.ts           # P2
    /routes             # Express routers
      auth.routes.ts    # P1 — /auth/*
      game.routes.ts    # P2, P4, P5 — /games/*
      user.routes.ts    # P4 — /users/*
    /socket             # Socket.IO event handlers
      gameSocket.ts     # P3 — move events
      spectatorSocket.ts  # P5 — spectator room join
    /services
      eloService.ts     # P4 — Elo calculation
      gameService.ts    # P3 — game state helpers
    /types              # Re-exports from ../../shared/types.ts
    index.ts            # Entry point — sets up Express + Socket.IO + DB
  tsconfig.json
  .env
```

## REST API

### Auth (P1)

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Returns JWT |
| GET | `/auth/me` | Yes | Current user info |

### Games (P2, P3, P4, P5)

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/games` | Yes | Create a new game, returns game ID + spectator token |
| POST | `/games/:id/join` | Yes | Join as the second player |
| GET | `/games/:id` | No | Get game state (used for replay) |
| GET | `/games/spectate/:token` | No | Get game by spectator token |

### Users (P4)

| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | `/users/:username/stats` | No | Wins, losses, draws, Elo |
| GET | `/users/:username/games` | No | Paginated game history |
| GET | `/leaderboard` | No | Top 10 players by Elo |

## Socket.IO events

The server uses rooms. Each game has two rooms:
- `game:{id}` — joined by the two players
- `spectate:{token}` — joined by spectators (read-only)

### Events the server listens for

| Event | Payload | Description |
|---|---|---|
| `game:join` | `{ gameId, token }` | Player joins their game room |
| `spectator:join` | `{ spectatorToken }` | Spectator joins a watch room |
| `move:make` | `{ gameId, move }` | Player submits a move |

### Events the server emits

| Event | Payload | Sent to |
|---|---|---|
| `game:start` | `{ game }` | Both players when second joins |
| `move:update` | `{ fen, pgn, turn, lastMove }` | Game room + spectator room |
| `game:over` | `{ winner, reason }` | Game room + spectator room |

## Database models

### User

```ts
{
  username: string        // unique
  email: string           // unique
  passwordHash: string
  elo: number             // default: 1000
  createdAt: Date
}
```

### Game

```ts
{
  whitePlayer: ObjectId   // ref: User
  blackPlayer: ObjectId   // ref: User (null until someone joins)
  status: 'waiting' | 'active' | 'finished'
  fen: string             // current board state
  pgn: string             // full move history
  winner: ObjectId | null // ref: User, null for draws
  result: 'white' | 'black' | 'draw' | null
  spectatorToken: string  // UUID, generated on game creation
  createdAt: Date
  finishedAt: Date | null
}
```

## Feature ownership

| Person | Files |
|---|---|
| P1 | `models/User.ts`, `routes/auth.routes.ts`, `middleware/auth.ts` |
| P2 | `models/Game.ts`, `routes/game.routes.ts` (create/join endpoints) |
| P3 | `socket/gameSocket.ts`, `services/gameService.ts` |
| P4 | `routes/user.routes.ts`, `services/eloService.ts` |
| P5 | `socket/spectatorSocket.ts`, `routes/game.routes.ts` (spectate endpoint) |

## Scripts

```bash
npm run dev        # Start with ts-node-dev (hot reload)
npm run build      # Compile TypeScript → /dist
npm run start      # Run compiled /dist/index.js (production)
npm run typecheck  # tsc without emitting
```

## Auth middleware

Protect any route by adding the `auth` middleware:

```ts
import { auth } from '../middleware/auth';

router.get('/protected', auth, (req, res) => {
  // req.user is the decoded JWT payload: { id, username }
  res.json({ user: req.user });
});
```

## Notes for the team

- Import shared types from `../../shared/types.ts` — the `Move`, `GameStatus`, and `SocketEvents` interfaces live there.
- Move validation must always happen server-side using `chess.js`. Never trust the client's move.
- When a game ends, P3's socket handler calls P4's `eloService.updateElo(winnerId, loserId)` — this is the main integration point between those two features.
- Spectator rooms receive the same `move:update` broadcasts as the player room — P3 emits to both rooms on every move.