import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import { initIO } from './socket/io';
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';

const app = express();
const httpServer = createServer(app);
initIO(httpServer);
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
