# Chess App

Учебен проект — fullstack уеб приложение за игра на шахмат в реално време между двама регистрирани играчи. Поддържа лоби, чат вътре в партията, наблюдатели (spectators), потребителски профили и ELO рейтингова система.

За пълна проектна документация виж [DOCUMENTATION.md](DOCUMENTATION.md).

---

## Технологичен стек

- **Frontend:** React 19, TypeScript, Vite 6, Zustand, Socket.IO client, react-chessboard, chess.js
- **Backend:** Node.js, Express, TypeScript, Socket.IO server, Mongoose, bcrypt, JWT
- **База данни:** MongoDB

---

## Структура на repo-то

```
chess-app/
├── client/        React + Vite клиент (port 5173)
├── server/        Express + Socket.IO сървър (port 3000)
├── shared/        Общи TypeScript типове (виж shared/README.md)
├── DOCUMENTATION.md   пълна проектна документация (BG)
└── README.md      този файл
```

---

## Изисквания

- **Node.js** 20 или по-нова версия
- **npm** 10+
- **MongoDB** 6+ (локално инсталирана или MongoDB Atlas cluster)
- (по избор) **Google OAuth Client ID** — само ако ще се ползва Google login

---

## Стартиране на проекта

### 1. Клониране

```bash
git clone <repo-url> chess-app
cd chess-app
```

### 2. Инсталация на зависимости

Една команда инсталира всички root + client + server пакети:

```bash
npm run install:all
```

### 3. Конфигурация на environment променливи

Копирай примерните `.env` файлове и попълни реалните стойности:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`:**

| Променлива | Описание | Пример |
|------------|----------|--------|
| `PORT` | HTTP порт на сървъра | `3000` |
| `MONGO_URI` | Connection string към MongoDB | `mongodb://localhost:27017/chess-app` |
| `JWT_SECRET` | Дълъг random string за JWT подписи | `<сложна-парола>` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (по избор) | `<id>.apps.googleusercontent.com` |

**`client/.env`:**

| Променлива | Описание | Пример |
|------------|----------|--------|
| `VITE_API_URL` | Base URL на сървъра | `http://localhost:3000` |
| `VITE_GOOGLE_CLIENT_ID` | Същият Google OAuth Client ID | `<id>.apps.googleusercontent.com` |

### 4. Старт на MongoDB

Ако ползваш локален MongoDB:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod
```

Или подай Atlas connection string в `MONGO_URI`.

### 5. Стартиране в development режим

Един команден ред пуска и клиента, и сървъра паралелно:

```bash
npm run dev
```

Приложението е достъпно на:

- **Клиент:** http://localhost:5173
- **Сървър:** http://localhost:3000
- **Health check:** http://localhost:3000/api/health

---

## Налични команди

| Команда | Действие |
|---------|----------|
| `npm run install:all` | Инсталира зависимостите на root + client + server |
| `npm run dev` | Стартира клиента и сървъра едновременно (через `concurrently`) |
| `npm run dev:client` | Стартира само клиента (Vite dev server) |
| `npm run dev:server` | Стартира само сървъра (Express + Socket.IO) |

### Build за production

```bash
# Build на клиента — Vite production build
cd client && npm run build

# Build на сървъра — TypeScript compile към dist/
cd server && npm run build

# Старт на компилирания сървър
cd server && npm start
```

---

## Документация

- [DOCUMENTATION.md](DOCUMENTATION.md) — пълна проектна документация на български: архитектура, модели на данните, HTTP API, Socket.IO събития, P1–P5 разпределение, ELO алгоритъм, диаграми.
- [shared/README.md](shared/README.md) — техническа референция за общите типове (на английски).

---

## Командна структура

Проектът е разработен от екип от 5 души с вертикален slice подход:

| # | Функционалност | Описание |
|---|---------------|----------|
| **P1** | Authentication | Регистрация, login, Google OAuth, JWT |
| **P2** | Matchmaking | Лоби, създаване и присъединяване към партия |
| **P3** | Game | Шахматна дъска, ходове в реално време, чат, draw/resign |
| **P4** | Score tracking | Профили, история на партиите, ELO, replay viewer |
| **P5** | Spectator | Наблюдение на партии без регистрация (UUID токен) |

---

## Troubleshooting

- **`ECONNREFUSED` към MongoDB** — провери, че MongoDB е стартиран и `MONGO_URI` е коректен.
- **Port 3000 / 5173 е зает** — смени `PORT` в `server/.env` (за сървъра); за клиента стартирай с `npm run dev:client -- --port 5174`.
- **Google login грешка** — провери, че `GOOGLE_CLIENT_ID` е еднакъв и в `server/.env`, и в `client/.env`, и че Authorized JavaScript origins в Google Cloud Console включва `http://localhost:5173`.
- **JWT `Invalid or expired token`** — токенът има срок от 30 минути; излез и влез отново.
