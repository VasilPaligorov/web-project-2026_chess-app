import { Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Game } from '../models/Game';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { getIO } from './io';
import {
  SocketEvents,
  type ChatSendPayload,
  type ChatMessagePayload,
} from '../../../shared/types';

async function onChatSend(socket: Socket, userId: string, payload: ChatSendPayload): Promise<void> {
  if (!payload || typeof payload.gameId !== 'string' || typeof payload.text !== 'string') return;

  const text = payload.text.trim();
  if (!text || text.length > 200) return;

  if (!mongoose.Types.ObjectId.isValid(payload.gameId)) return;

  const game = await Game.findById(payload.gameId).select('whitePlayer blackPlayer status');
  if (!game || game.status === 'waiting') return;

  const isPlayer =
    game.whitePlayer.toString() === userId ||
    game.blackPlayer?.toString() === userId;
  if (!isPlayer) return;

  const user = await User.findById(userId).select('username').lean();
  if (!user) return;

  const message = await Message.create({
    gameId: payload.gameId,
    userId,
    username: user.username,
    text,
  });

  const outgoing: ChatMessagePayload = {
    id: message._id.toString(),
    userId,
    username: user.username,
    text,
    createdAt: (message.createdAt as Date).toISOString(),
  };

  getIO().to(`game:${payload.gameId}`).emit(SocketEvents.CHAT_RECEIVE, outgoing);
}

export async function sendChatHistory(socket: Socket, gameId: string): Promise<void> {
  const messages = await Message.find({ gameId }).sort({ createdAt: 1 }).limit(50).lean();

  const history: ChatMessagePayload[] = messages.map((m) => ({
    id: m._id.toString(),
    userId: m.userId.toString(),
    username: m.username,
    text: m.text,
    createdAt: (m.createdAt as Date).toISOString(),
  }));

  socket.emit(SocketEvents.CHAT_HISTORY, history);
}

export function registerChatHandlers(socket: Socket): void {
  const userId = socket.data.userId;
  if (!userId) return;

  socket.on(SocketEvents.CHAT_SEND, (payload: ChatSendPayload) =>
    onChatSend(socket, userId, payload),
  );
}
