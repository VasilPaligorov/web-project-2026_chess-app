import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(): Socket {
  const token = useAuthStore.getState().token;

  // Reset cached socket if the auth token has changed since it was created
  // (e.g. logout → login in the same tab without a full reload).
  if (socket && socketToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    socketToken = token;
    socket = io(URL, {
      auth: { token },
      autoConnect: true,
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
