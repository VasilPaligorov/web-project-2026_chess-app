# Chess App — Client

React 19 + TypeScript frontend на шахматното приложение. Изграден с Vite за бърз dev server и оптимизиран production build.

## Технологичен стек

- **React 19** + TypeScript
- **Vite 6** — dev server и bundler
- **React Router v7** — клиентско рутиране (SPA)
- **Socket.IO client 4** — реал-тайм update-и на партията
- **Zustand 5** (`persist` middleware) — глобално състояние (auth)
- **react-chessboard 5** — шахматна дъска
- **chess.js 1.4** — локална UX валидация на ходове
- **axios** — HTTP заявки към сървъра
- **@react-oauth/google** — Google OAuth login
- **framer-motion** — анимации на UI преходи
- **@react-three/fiber + drei + three** — 3D рендериране на дъската (по избор)

## Стартиране

Инсталация от root-а (препоръчително):

```bash
# от корена на repo-то
npm run install:all
```

Или само клиента:

```bash
cd client
npm install --legacy-peer-deps
```

Старт на dev server-а:

```bash
npm run dev
```

Клиентът тръгва на `http://localhost:5173`. Увери се, че сървърът също работи — от root-а `npm run dev` стартира двамата паралелно.

## Environment променливи

Създай `client/.env` (виж [`.env.example`](.env.example)):

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=твоят-google-oauth-client-id.apps.googleusercontent.com
```

| Променлива | Описание |
|------------|----------|
| `VITE_API_URL` | Base URL на сървъра (REST + Socket.IO) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID (същият като в сървъра) |

Vite експозва само променливи с префикс `VITE_`.

## Структура на папките

```
/client
  /src
    /pages                         една папка на route/feature
      Home.tsx                     публична начална страница
      Home.module.css
      /auth                        P1
        Login.tsx
        Register.tsx
      /lobby                       P2
        Lobby.tsx
        useLobby.ts                hook — currentGames + socket subscriptions
        useWaitingGames.ts         hook — poll + LOBBY_CHANGED subscription
        /components
          WaitingGamesList.tsx
          ActiveGamesList.tsx
          _listBase.module.css     споделена база (CSS Modules composes:)
      /game                        P3
        GamePage.tsx
        useGame.ts                 hook — game state, socket events, actions
        useChat.ts                 hook — chat канал
        game.utils.ts              pure helpers (getMyColor, turnFromFen)
        /components
          ChatPanel.tsx
          Board.tsx, ControlsBar.tsx, ...
      /profile                     P4
        Profile.tsx
        useProfile.ts
        profile.utils.ts           replay builder, formatters
        /components
          ProfileHero.tsx, StatsGrid.tsx, GameRow.tsx
          ReplayViewer.tsx, ReplayControls.tsx, MoveList.tsx
          EditProfileModal.tsx
      /spectate                    P5
        SpectatorPage.tsx
        useSpectate.ts             HTTP resolve + socket join
    /components                    споделени компоненти
      Header.tsx, Layout.tsx       (Header.module.css, Layout.module.css)
      ProtectedRoute.tsx           guard за защитените routes
      GoogleAuthButton.tsx
      ChessScene.tsx               3D scene (по избор)
      SceneLights.tsx
      /icons
    /services
      api.ts                       axios singleton + Authorization interceptor
      socket.ts                    Socket.IO singleton с reactive token reconnect
    /store
      authStore.ts                 Zustand store (user, token) с persist
    /hooks                         (cross-cutting hooks, ако има)
    /styles
      tokens.css                   CSS токени (цветове, типография, spacing)
      base.css                     глобална нулирка
    /assets
    App.tsx                        BrowserRouter + Routes
    main.tsx                       entry point + CSS import
    vite-env.d.ts
  index.html
  vite.config.ts
  tsconfig.json
  .env.example
```

## Routes

Източник: [`src/App.tsx`](src/App.tsx).

| Path | Компонент | Auth | Owner |
|------|-----------|------|-------|
| `/` | `Home` | публичен | (споделен) |
| `/login` | `Login` | публичен | P1 |
| `/register` | `Register` | публичен | P1 |
| `/lobby` | `Lobby` | ✅ | P2 |
| `/game/:gameId` | `GamePage` | ✅ | P3 |
| `/profile/:userId` | `Profile` | ✅ | P4 |
| `/spectate/:token` | `SpectatorPage` | публичен (UUID токен) | P5 |

Защитените routes са обвити в `<ProtectedRoute><Layout /></ProtectedRoute>` — при липсващ token се пренасочват към `/login`.

## Разпределение по екипа

Всяка page папка се owner-ва от един човек. Споделените компоненти в `/components` се обсъждат с екипа преди добавяне.

| # | Папки / файлове |
|---|-----------------|
| **P1** | `pages/auth/`, `components/GoogleAuthButton.tsx`, `store/authStore.ts`, `components/ProtectedRoute.tsx` |
| **P2** | `pages/lobby/` (включително `useLobby.ts`, `useWaitingGames.ts`, `components/*`) |
| **P3** | `pages/game/`, `components/ChessScene.tsx`, `components/SceneLights.tsx` |
| **P4** | `pages/profile/` (всички sub-components + `useProfile.ts`) |
| **P5** | `pages/spectate/`, `useSpectate.ts` |

## Команди

```bash
npm run dev       # стартира Vite dev server (port 5173)
npm run build     # tsc -b + Vite production build → /dist
npm run preview   # preview на production build-а локално
```

## Свързване със сървъра

### HTTP клиент

Всички API заявки минават през [`src/services/api.ts`](src/services/api.ts) — axios singleton:

```ts
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Socket.IO

Socket-ът се управлява от [`src/services/socket.ts`](src/services/socket.ts) — singleton, който се преоткрива при смяна на токена. Token-ът се подава като `handshake.auth.token`:

```ts
const socket = io(import.meta.env.VITE_API_URL, {
  auth: { token: useAuthStore.getState().token },
});
```

## Конвенции

- **Page-scoped hooks** — всяка страница си има `use<Feature>.ts` (`useLobby`, `useGame`, `useChat`, `useProfile`, `useSpectate`), който инкапсулира state и socket subscriptions.
- **`<feature>.utils.ts`** — pure helper функции (формат, FEN parsing) са отделно от hook-овете.
- **CSS Modules** — всеки компонент има свой `*.module.css`, колониран до `.tsx`. Никакви inline стилове.
- **CSS токени** — цветове, типография, spacing и motion идват от [`styles/tokens.css`](src/styles/tokens.css). Не hardcoded-вай стойности.
- **CSS Modules `composes:`** — за shared базови стилове (виж [`pages/lobby/components/_listBase.module.css`](src/pages/lobby/components/_listBase.module.css)).

## Бележки за екипа

- Импортирай общи типове от `../../../shared/types.ts` — никога не дефинирай `User`, `Game` или `Move` локално.
- Използвай Zustand store за state, който е нужен на повече от една страница (currently само auth). За UI-only state — локален `useState`.
- `react-chessboard` се ползва и в [`pages/game`](src/pages/game/) (P3), и в [`pages/spectate`](src/pages/spectate/) (P5). P3 owner-ва конфигурацията; P5 просто подава `arePiecesDraggable: false`.
- Клиентският chess.js е за **UX превю** само (legal-move highlight, optimistic FEN). Авторитетът е винаги сървърен.
