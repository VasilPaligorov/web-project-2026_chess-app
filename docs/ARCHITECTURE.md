### Архитектура — Head2Head Chess

Уеб приложение за шах в реално време: React SPA клиент, Express + Socket.IO сървър и MongoDB. Клиентът и сървърът споделят общи TypeScript типове през `shared/types.ts`.

#### Обща архитектура

```mermaid
flowchart LR
  subgraph Client["Клиент — React + Vite SPA"]
    Pages["Страници<br/>Home · Login / Register · Lobby<br/>GamePage · Profile · Spectate"]
    Board["3D дъска<br/>Board3D / ChessScene<br/>(three.js + react-three-fiber)"]
    Store["authStore (Zustand)<br/>user + JWT, persist в localStorage"]
    Api["services/api.ts<br/>axios + Bearer interceptor"]
    Sock["services/socket.ts<br/>socket.io-client"]
    Pages --> Board
    Pages --> Store
    Pages --> Api
    Pages --> Sock
  end

  subgraph Server["Сървър — Express + Socket.IO"]
    Routes["REST routes<br/>/api/auth · /api/games · /api/users"]
    MW["Middleware<br/>requireAuth · asyncHandler · errorHandler"]
    Ctrl["Controllers<br/>auth · game · spectator"]
    SockMW["Socket middleware<br/>JWT + blacklist проверка"]
    Handlers["Socket handlers<br/>gameSocket · chatSocket · spectatorSocket<br/>(обвити в safeHandler срещу необработени грешки)"]
    Chess["chess.js<br/>валидация на ходовете"]
    Elo["eloService<br/>преизчисляване на рейтинг"]
    Utils["utils<br/>jwt · password (bcrypt)<br/>tokenBlacklist · google"]
    Routes --> MW --> Ctrl --> Utils
    SockMW --> Handlers
    Handlers --> Chess
    Handlers --> Elo
  end

  subgraph Mongo["MongoDB (Mongoose)"]
    U[("User")]
    G[("Game")]
    Msg[("Message")]
    BT[("BlacklistedToken<br/>TTL индекс")]
  end

  GoogleOAuth["Google OAuth"]

  Api -- "HTTP REST<br/>Authorization: Bearer JWT" --> Routes
  Sock -- "WebSocket<br/>auth: { token }" --> SockMW
  Ctrl --> U
  Ctrl --> G
  Ctrl --> BT
  Ctrl -- "emit lobby:changed<br/>при създаване / join / отказ" --> Handlers
  Handlers --> G
  Handlers --> Msg
  Elo --> U
  Utils -- "проверка на access token" --> GoogleOAuth

  Shared["shared/types.ts<br/>общи типове + SocketEvents"]
  Client -.-> Shared
  Server -.-> Shared
```

#### Поток на един ход

```mermaid
sequenceDiagram
  participant P as Играч
  participant C as Клиент (useGame)
  participant S as Сървър (gameSocket)
  participant DB as MongoDB
  participant O as Опонент и зрители

  P->>C: мести фигура
  C->>S: move:make { gameId, from, to }
  S->>S: chess.js — легален ли е ходът, на ход ли е играчът?
  alt невалиден ход
    S-->>C: move:error
  else валиден ход
    S->>DB: обновява Game (fen, pgn)
    S-->>C: move:update
    S-->>O: move:update (стая game:{id})
    opt мат / реми / предаване
      S->>S: eloService — нови рейтинги
      S->>DB: резултат + ELO в User
      S-->>C: game:over
      S-->>O: game:over
    end
  end
```

#### Автентикация

```mermaid
sequenceDiagram
  participant U as Потребител
  participant C as Клиент
  participant S as Сървър
  participant DB as MongoDB
  participant G as Google

  rect rgb(245, 245, 245)
    note over U, DB: Регистрация / вход с парола
    U->>C: форма (валидация на клиента)
    C->>S: POST /api/auth/register или /login
    S->>S: валидация на входа (типове, формат, дължини)
    S->>DB: User (bcrypt hash на паролата)
    S-->>C: { user, token (JWT, 30 мин) }
  end

  rect rgb(245, 245, 245)
    note over U, G: Вход с Google
    U->>C: бутон "Sign in with Google"
    C->>G: OAuth implicit flow → access token
    C->>S: POST /api/auth/google { accessToken }
    S->>G: проверка на токена (audience, email_verified)
    S->>DB: намира по googleId / email или създава User<br/>(username се генерира от email-а)
    S-->>C: { user, token }
  end

  rect rgb(245, 245, 245)
    note over U, DB: Изход
    C->>S: POST /api/auth/logout
    S->>DB: токенът влиза в BlacklistedToken (TTL до изтичането му)
    S->>S: прекъсва активните socket връзки на потребителя
  end
```

#### REST API

| Метод | Път | Auth | Описание |
|---|---|---|---|
| POST | `/api/auth/register` | – | регистрация |
| POST | `/api/auth/login` | – | вход с email/username + парола |
| POST | `/api/auth/google` | – | вход с Google access token |
| POST | `/api/auth/logout` | ✔ | изход + blacklist на токена |
| GET | `/api/auth/me` | ✔ | текущ потребител |
| POST | `/api/games` | ✔ | създаване на игра |
| GET | `/api/games/waiting` | ✔ | чакащи игри (лоби) |
| GET | `/api/games/me/current` | ✔ | моите активни игри |
| GET | `/api/games/:id` | ✔ | игра по id |
| POST | `/api/games/:id/join` | ✔ | присъединяване |
| DELETE | `/api/games/:id` | ✔ | отказ на чакаща игра |
| GET | `/api/games/spectate/:token` | – | игра по зрителски линк |
| GET | `/api/users/leaderboard` | ✔ | класация по ELO |
| GET | `/api/users/:id` | ✔ | профил |
| GET | `/api/users/:id/games` | ✔ | история на игрите |

#### Socket.IO събития

| Събитие | Посока | Описание |
|---|---|---|
| `game:join` / `game:leave` | клиент → сървър | влизане / излизане от стаята на играта |
| `move:make` | клиент → сървър | заявка за ход |
| `move:update` | сървър → стая | приет ход (нов FEN) |
| `move:error` | сървър → клиент | отхвърлен ход |
| `game:resign` | клиент → сървър | предаване |
| `game:over` | сървър → стая | край на играта + резултат |
| `draw:offer` / `draw:accept` / `draw:decline` | клиент → сървър | предложение за реми |
| `chat:send` / `chat:receive` / `chat:history` | двупосочно | чат между играчите |
| `spectator:join` / `spectator:leave` | клиент → сървър | гледане по зрителски линк |
| `lobby:changed` | сървър → всички | лобито се е променило (нова / заета / отказана игра) — клиентът презарежда списъка |

#### Модели в базата

- **User** — username, email, passwordHash (bcrypt), googleId, elo / peakElo, wins / losses / draws
- **Game** — whitePlayer / blackPlayer, статус (`waiting / active / finished`), fen, pgn (история на ходовете), result / winner / endReason, drawOffer, spectatorToken
- **Message** — чат съобщения по игра
- **BlacklistedToken** — SHA-256 хеш на анулиран JWT, изтрива се автоматично от MongoDB TTL индекс
