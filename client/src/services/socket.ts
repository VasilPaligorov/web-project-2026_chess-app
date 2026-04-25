import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(URL, {
    auth: { token: useAuthStore.getState().token },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
