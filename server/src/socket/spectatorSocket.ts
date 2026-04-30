import { Socket } from 'socket.io';
import { Game } from '../models/Game';
import { SocketEvents } from '../../../shared/types';

export function registerSpectatorHandlers(socket: Socket): void {
  socket.on(SocketEvents.SPECTATOR_JOIN, async (token: unknown) => {
    if (typeof token !== 'string' || !token) return;

    const game = await Game.exists({ spectatorToken: token });
    if (!game) return;

    socket.join(`spectate:${token}`);
  });
}
