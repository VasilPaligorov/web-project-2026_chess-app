import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { registerSpectatorHandlers } from './spectatorSocket';

declare module 'socket.io' {
  interface SocketData {
    userId: string | undefined;
  }
}

let io: Server | null = null;

export const initIO = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: { origin: ['http://localhost:5173', 'http://localhost:5174'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      next();
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
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }
    registerSpectatorHandlers(socket);
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
