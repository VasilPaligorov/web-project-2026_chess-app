# Chess App — Client

The React + TypeScript frontend for the Head-to-Head Chess application. Built with Vite for fast development and optimised production builds.

## Tech stack

- **React 18** with TypeScript
- **Vite** — dev server and bundler
- **React Router v6** — client-side routing
- **Socket.IO client** — real-time game updates
- **Zustand** — global state management (auth, active game)
- **react-chessboard** — chessboard UI component
- **Axios** — HTTP requests to the server

## Getting started

Install dependencies from the project root (recommended):

```bash
# from /chess-app root
npm run install:all
```

Or install just the client:

```bash
cd client
npm install
```

Start the dev server:

```bash
npm run dev
```

The client runs on `http://localhost:5173` by default. Make sure the server is also running — use `npm run dev` from the root to start both together.

## Environment variables

Create a `.env` file in `/client`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Vite only exposes variables prefixed with `VITE_` to the browser.

## Folder structure

```
/client
  /src
    /components       # Shared UI components (Button, Modal, Layout, etc.)
    /pages            # One folder per route/feature
      /auth           # P1 — Login and Register pages
      /lobby          # P2 — Create game, waiting room
      /game           # P3 — Chessboard and game loop
      /profile        # P4 — Stats, game history, leaderboard
      /spectate       # P5 — Read-only board via spectator link
    /hooks            # Custom React hooks (useSocket, useAuth, useGame)
    /store            # Zustand stores (authStore, gameStore)
    /api              # Axios instance + typed API call functions
    /types            # Re-exports from ../../shared/types.ts
    main.tsx
    App.tsx
  index.html
  vite.config.ts
  tsconfig.json
  .env
```

## Routes

| Path | Component | Owner | Description |
|---|---|---|---|
| `/login` | `LoginPage` | P1 | User login |
| `/register` | `RegisterPage` | P1 | User registration |
| `/lobby` | `LobbyPage` | P2 | Create or join a game |
| `/game/:id` | `GamePage` | P3 | Live chessboard |
| `/profile/:username` | `ProfilePage` | P4 | Stats and game history |
| `/leaderboard` | `LeaderboardPage` | P4 | Global Elo rankings |
| `/watch/:token` | `SpectatePage` | P5 | Read-only spectator view |

## Feature ownership

Each page folder is owned by one person. Shared components in `/components` should be discussed as a team before adding.

| Person | Folder(s) |
|---|---|
| P1 | `pages/auth`, `store/authStore.ts`, `api/auth.ts` |
| P2 | `pages/lobby`, `api/games.ts` (create/join) |
| P3 | `pages/game`, `hooks/useSocket.ts`, `hooks/useGame.ts` |
| P4 | `pages/profile`, `api/stats.ts` |
| P5 | `pages/spectate`, `hooks/useSpectator.ts` |

## Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build → /dist
npm run preview    # Preview production build locally
npm run typecheck  # Run tsc without emitting files
npm run lint       # ESLint
```

## Connecting to the server

All API calls go through `/src/api/client.ts` — an Axios instance that automatically attaches the JWT from localStorage:

```ts
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

The Socket.IO connection is managed in `hooks/useSocket.ts` and shared via a singleton so all components subscribe to the same socket instance.

## Notes for the team

- Import shared types from `../../shared/types.ts` — never redefine `User`, `Game`, or `Move` locally.
- Use Zustand stores for anything that multiple pages need (current user, active game state). Use local `useState` for UI-only state.
- The `react-chessboard` component is used in both `pages/game` (P3) and `pages/spectate` (P5). P3 owns the component configuration — P5 just passes `draggable={false}`.