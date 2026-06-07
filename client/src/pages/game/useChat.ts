import { useCallback, useEffect, useState } from 'react';
import { getSocket } from '../../services/socket';
import {
  SocketEvents,
  type ChatMessagePayload,
  type ChatSendPayload,
} from '../../../../shared/types';

export interface UseChatResult {
  messages: ChatMessagePayload[];
  sendMessage: (text: string) => void;
}

export function useChat(gameId: string | undefined): UseChatResult {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);

  useEffect(() => {
    if (!gameId) return;
    const socket = getSocket();

    const onHistory = (history: ChatMessagePayload[]) => {
      setMessages(history);
    };

    const onReceive = (msg: ChatMessagePayload) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on(SocketEvents.CHAT_HISTORY, onHistory);
    socket.on(SocketEvents.CHAT_RECEIVE, onReceive);

    return () => {
      socket.off(SocketEvents.CHAT_HISTORY, onHistory);
      socket.off(SocketEvents.CHAT_RECEIVE, onReceive);
    };
  }, [gameId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!gameId || !text.trim()) return;
      const payload: ChatSendPayload = { gameId, text: text.trim() };
      getSocket().emit(SocketEvents.CHAT_SEND, payload);
    },
    [gameId],
  );

  return { messages, sendMessage };
}
