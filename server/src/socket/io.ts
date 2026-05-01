import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

declare module 'socket.io' {
  interface SocketData {
    userId: string;
  }
}

let io: Server | null = null;

export const initIO = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: { origin: ['http://localhost:5173', 'http://localhost:5174'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      next(new Error('Auth token missing'));
      return;
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
