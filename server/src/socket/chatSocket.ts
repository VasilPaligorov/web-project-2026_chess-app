import { Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Game } from '../models/Game';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { getIO } from './io';
import { safeHandler } from './safeHandler';
import {
  SocketEvents,
  MAX_CHAT_MESSAGE_LENGTH,
  type ChatSendPayload,
  type ChatMessagePayload,
  type ChatHistoryPayload,
} from '../../../shared/types';

const CHAT_HISTORY_LIMIT = 50;

interface StoredChatMessage {
  _id: unknown;
  userId: unknown;
  username: string;
  text: string;
  createdAt: Date;
}

function toChatMessagePayload(message: StoredChatMessage, gameId: string): ChatMessagePayload {
  return {
    id: String(message._id),
    gameId,
    userId: String(message.userId),
    username: message.username,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  };
}

async function onChatSend(userId: string, payload: ChatSendPayload): Promise<void> {
  if (!payload || typeof payload.gameId !== 'string' || typeof payload.text !== 'string') return;

  const text = payload.text.trim();
  if (!text || text.length > MAX_CHAT_MESSAGE_LENGTH) return;

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

  getIO()
    .to(`game:${payload.gameId}`)
    .emit(SocketEvents.CHAT_RECEIVE, toChatMessagePayload(message, payload.gameId));
}

export async function sendChatHistory(socket: Socket, gameId: string): Promise<void> {
  const messages = await Message.find({ gameId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(CHAT_HISTORY_LIMIT)
    .lean();

  const history: ChatHistoryPayload = {
    gameId,
    messages: messages.reverse().map((m) => toChatMessagePayload(m, gameId)),
  };

  socket.emit(SocketEvents.CHAT_HISTORY, history);
}

export function registerChatHandlers(socket: Socket): void {
  const userId = socket.data.userId;
  if (!userId) return;

  socket.on(
    SocketEvents.CHAT_SEND,
    safeHandler((payload: ChatSendPayload) => onChatSend(userId, payload)),
  );
}
