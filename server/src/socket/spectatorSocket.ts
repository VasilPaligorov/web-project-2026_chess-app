import { Socket } from 'socket.io';
import { Game } from '../models/Game';
import { SocketEvents } from '../../../shared/types';
import { safeHandler } from './safeHandler';

export function registerSpectatorHandlers(socket: Socket): void {
  socket.on(
    SocketEvents.SPECTATOR_JOIN,
    safeHandler(async (token: unknown) => {
      if (typeof token !== 'string' || !token) return;

      const game = await Game.exists({ spectatorToken: token });
      if (!game) return;

      socket.join(`spectate:${token}`);
    }),
  );

  socket.on(SocketEvents.SPECTATOR_LEAVE, (token: unknown) => {
    if (typeof token !== 'string' || !token) return;
    socket.leave(`spectate:${token}`);
  });
}
