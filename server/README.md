# Chess App — Server

Node.js + Express + TypeScript backend на шахматното приложение. Обработва автентикация, авторитетна валидация на ходовете, реал-тайм комуникация през Socket.IO и всички взаимодействия с базата през Mongoose.

## Технологичен стек

- **Node.js + TypeScript** (`ts-node-dev` за dev, компилиран JS за production)
- **Express 4** — REST API
- **Socket.IO 4** — двупосочни събития в реално време (ходове, start, spectator)
- **Mongoose 8** — MongoDB ODM
- **chess.js** — авторитетна валидация на ходове и FEN/PGN управление
- **jsonwebtoken** — JWT създаване и верификация
- **bcrypt** — хеширане на пароли (12 salt rounds)
- **google-auth-library** — верификация на Google access токени
- **uuid** — генериране на spectator токени
- **dotenv** — конфигурация през environment variables

## Стартиране

Инсталация от root-а (препоръчително):

```bash
# от корена на repo-то
npm run install:all
```

Или само сървъра:

```bash
cd server
npm install
```

Старт в development режим (с hot reload):

```bash
npm run dev
```

Сървърът тръгва на `http://localhost:3000`.

## Изисквания

- **Node.js** 20+
- **MongoDB** 6+ (локално на `mongodb://localhost:27017` или Atlas connection string в `.env`)

## Environment променливи

Създай `server/.env` с тези стойности (виж [`.env.example`](.env.example)):

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/chess-app
JWT_SECRET=замени-с-дълъг-random-string
GOOGLE_CLIENT_ID=твоят-google-oauth-client-id.apps.googleusercontent.com
```

| Променлива | Описание |
|------------|----------|
| `PORT` | HTTP порт |
| `MONGO_URI` | Connection string към MongoDB |
| `JWT_SECRET` | Секрет за JWT подписи (използва се и от Socket.IO middleware) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (за `/api/auth/google`) |

`.env` файлът е в `.gitignore` — никога не го commit-вай.

## Структура на папките

```
/server
  /src
    /config
      db.ts                      Mongoose connect
    /middleware
      auth.ts                    requireAuth (JWT verify + blacklist check)
      asyncHandler.ts            обвива async controllers
      errorHandler.ts            централизиран error handler
    /models
      User.ts                    P1 — потребител (ELO, peakElo, статистики)
      Game.ts                    P2 + P3 — партия (FEN, PGN, draw offer, spectatorToken)
      Message.ts                 P3 — чат съобщения
      BlacklistedToken.ts        P1 — TTL колекция за invalidated JWT
    /routes
      auth.routes.ts             P1 — /api/auth/*
      game.routes.ts             P2 + P3 + P5 — /api/games/*
      user.routes.ts             P4 — /api/users/*
    /controllers
      auth.controller.ts         register / login / google / logout / getCurrentUser
      game.controller.ts         createGame / listWaitingGames / getCurrentGames /
                                  getGameById / joinGame / cancelGame
      game.helpers.ts            shared logic
      user.controller.ts         leaderboard / profile / games / update*
      spectator.controller.ts    getSpectateGame (по UUID токен)
    /socket
      io.ts                      Socket.IO bootstrap + auth middleware
      gameSocket.ts              P3 — move / resign / draw събития
      chatSocket.ts              P3 — chat send / history
      spectatorSocket.ts         P5 — spectator join / leave
      safeHandler.ts             обвива async socket handlers
    /services
      eloService.ts              P4 — ELO калкулация (K=32, MIN=100)
      tokenBlacklist.service.ts  P1 — SHA-256 hash + TTL insert
    /utils
      jwt.ts                     signToken / verifyToken
      password.ts                hashPassword / comparePassword (bcrypt)
      google.ts                  verifyGoogleAccessToken
    index.ts                     Express + Socket.IO + DB bootstrap
  tsconfig.json
  .env.example
```

## REST API

Всички защитени endpoint-и изискват `Authorization: Bearer <jwt>` header.
Унифициран response: `{ success: true, data }` или `{ success: false, message }`.

### Authentication (P1)

| Метод | Път | Auth | Описание |
|-------|-----|------|----------|
| `POST` | `/api/auth/register` | публичен | Регистрация на нов потребител |
| `POST` | `/api/auth/login` | публичен | Login с username/email + парола |
| `POST` | `/api/auth/google` | публичен | Login през Google OAuth access token |
| `POST` | `/api/auth/logout` | ✅ | Добавя JWT в blacklist |
| `GET`  | `/api/auth/me` | ✅ | Връща актуалния потребител |

### Games (P2 + P3 + P5)

| Метод | Път | Auth | Описание |
|-------|-----|------|----------|
| `POST`   | `/api/games` | ✅ | Създава партия (статус `waiting`) |
| `GET`    | `/api/games/waiting` | ✅ | Списък на чакащите партии |
| `GET`    | `/api/games/me/current` | ✅ | Моите активни/чакащи партии |
| `GET`    | `/api/games/:id` | ✅ | Зарежда конкретна партия |
| `POST`   | `/api/games/:id/join` | ✅ | Присъединяване към waiting партия |
| `DELETE` | `/api/games/:id` | ✅ | Отказва waiting партия (само създателят) |
| `GET`    | `/api/games/spectate/:token` | публичен | Резолвва spectator UUID токен (P5) |

### Users (P4)

| Метод | Път | Auth | Описание |
|-------|-----|------|----------|
| `GET`   | `/api/users/leaderboard` | ✅ | Top N играчи по ELO |
| `GET`   | `/api/users/:id` | ✅ | Профил с агрегирана статистика |
| `GET`   | `/api/users/:id/games` | ✅ | История на партиите |
| `PATCH` | `/api/users/:id` | ✅ | Обновява username |
| `PATCH` | `/api/users/:id/password` | ✅ | Обновява парола |

### Health

| Метод | Път | Описание |
|-------|-----|----------|
| `GET` | `/api/health` | Liveness probe — `{ status: 'ok' }` |

## Socket.IO

Сървърът използва три типа стаи:

- `user:{userId}` — всеки автентикиран сокет автоматично join-ва тук (за персонални нотификации).
- `game:{gameId}` — двамата играчи в партията.
- `spectate:{spectatorToken}` — наблюдателите (без авторизация).

`MOVE_UPDATE` и `GAME_OVER` се излъчват едновременно към `game:` и `spectate:` стаите чрез:

```ts
getIO()
  .to(`game:${game._id}`)
  .to(`spectate:${game.spectatorToken}`)
  .emit(SocketEvents.MOVE_UPDATE, update);
```

### Събития, които сървърът слуша (client → server)

| Събитие | Payload | Описание |
|---------|---------|----------|
| `game:join` | `gameId: string` | Играч се присъединява към `game:{id}` |
| `game:leave` | `gameId: string` | Излиза от `game:{id}` |
| `move:make` | `MovePayload` | Предложение за ход |
| `game:resign` | `gameId: string` | Предаване |
| `draw:offer` | `gameId: string` | Предложение за реми |
| `draw:accept` | `gameId: string` | Приема reми |
| `draw:decline` | `gameId: string` | Отказва реми |
| `chat:send` | `ChatSendPayload` | Изпраща чат съобщение |
| `spectator:join` | `spectatorToken: string` | Наблюдател join-ва `spectate:{token}` |
| `spectator:leave` | `spectatorToken: string` | Наблюдател напуска |

### Събития, които сървърът излъчва (server → client)

| Събитие | Получател | Описание |
|---------|-----------|----------|
| `game:start` | `user:{whiteId}` + `user:{blackId}` | При join от втория играч |
| `move:update` | `game:{id}` + `spectate:{token}` | Валиден ход — новата позиция |
| `move:error` | изпращача | Невалиден ход |
| `game:over` | `game:{id}` + `spectate:{token}` | Край на партията |
| `draw:offer` | опонентът | Получено предложение за реми |
| `draw:declined` | предложителя | Опонентът отказа |
| `chat:receive` | `game:{id}` | Ново чат съобщение |
| `chat:history` | новоприсъединилия се | Историята при `game:join` |
| `lobby:changed` | всички автентикирани | Лобито трябва да се рефрешне |

## Модели на данните

Подробен преглед — виж главния [`DOCUMENTATION.md`](../DOCUMENTATION.md#8-модели-на-данните) или директно [`src/models/`](src/models/).

### User
```ts
{
  username: string         // unique, trimmed
  email: string            // unique, lowercase
  passwordHash?: string    // select: false; липсва за Google-only акаунти
  googleId?: string        // unique, sparse
  elo: number              // default 1200, indexed
  peakElo: number          // default 1200
  wins: number, losses: number, draws: number
  createdAt: Date
}
```

### Game
```ts
{
  whitePlayer: ObjectId       // ref User, required
  blackPlayer: ObjectId | null
  status: 'waiting' | 'active' | 'finished'
  result: 'white' | 'black' | 'draw' | null
  winner: ObjectId | null
  fen: string                 // current FEN
  pgn: string                 // full move history
  spectatorToken: string      // UUID v4, unique
  drawOffer: { from: ObjectId } | null
  createdAt: Date
  finishedAt: Date | null
  endReason: 'checkmate' | 'resignation' | 'stalemate' | ... | null
}
```

### Message
```ts
{
  gameId: ObjectId   // ref Game, indexed
  userId: ObjectId   // ref User
  username: string   // денормализирано
  text: string       // maxlen 200
  createdAt: Date
}
```

### BlacklistedToken
```ts
{
  tokenHash: string  // SHA-256 hash на JWT
  expiresAt: Date    // TTL индекс (expires: 0) — auto cleanup
}
```

## Разпределение по екипа

| # | Файлове |
|---|---------|
| **P1** | `models/User.ts`, `models/BlacklistedToken.ts`, `routes/auth.routes.ts`, `controllers/auth.controller.ts`, `middleware/auth.ts`, `services/tokenBlacklist.service.ts`, `utils/{jwt,password,google}.ts` |
| **P2** | `routes/game.routes.ts` (create/join/cancel/list/current), `controllers/game.controller.ts`, `controllers/game.helpers.ts` |
| **P3** | `models/Game.ts`, `models/Message.ts`, `socket/gameSocket.ts`, `socket/chatSocket.ts` |
| **P4** | `routes/user.routes.ts`, `controllers/user.controller.ts`, `services/eloService.ts` |
| **P5** | `controllers/spectator.controller.ts`, `socket/spectatorSocket.ts`, `routes/game.routes.ts` (spectate endpoint) |

## Команди

```bash
npm run dev       # старт с ts-node-dev (hot reload)
npm run build     # TypeScript compile → /dist
npm start         # старт на компилирания /dist (production)
```

## Защита на route-овете

За защитен endpoint добави `requireAuth` middleware:

```ts
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

router.get('/protected', requireAuth, asyncHandler(async (req, res) => {
  // req.user е JWT payload: { userId, exp, iat }
  res.json({ success: true, data: { userId: req.user!.userId } });
}));
```

## Бележки за екипа

- Импортирай общи типове от `../../shared/types.ts` — `Move`, `GameStatus`, `SocketEvents` и payload интерфейсите са там.
- **Никога не доверявай хода на клиента.** Винаги преисъздавай `Chess` от записания PGN/FEN и валидирай със сървърен `chess.js`.
- Когато партията завърши, gameSocket вика `eloService.updateElo(white, black, result)` — това е интеграционната точка между P3 и P4.
- Spectator стаите получават огледално копие на `MOVE_UPDATE` / `GAME_OVER` — emit-ва се едновременно към `game:` и `spectate:`.
- `BlacklistedToken` чисти сам остарелите записи чрез TTL индекс — няма нужда от cron.
