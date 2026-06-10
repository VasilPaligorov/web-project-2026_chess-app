import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { SocketEvents, type Game } from '../../../../shared/types';

interface CurrentGamesResponse {
  success: boolean;
  data: Game[];
}

interface UseLobbyOptions {
  onGameStart: (game: Game) => void;
}

interface UseLobbyResult {
  currentGames: Game[];
  myActiveGames: Game[];
}

export function useLobby({ onGameStart }: UseLobbyOptions): UseLobbyResult {
  const [currentGames, setCurrentGames] = useState<Game[]>([]);

  const onGameStartRef = useRef(onGameStart);
  onGameStartRef.current = onGameStart;

  const fetchCurrentGames = useCallback(async () => {
    try {
      const { data } = await api.get<CurrentGamesResponse>('/api/games/me/current');
      if (data.success) setCurrentGames(data.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCurrentGames();
    const socket = getSocket();
    const dispatchGameStart = (game: Game) => onGameStartRef.current(game);
    socket.on(SocketEvents.GAME_START, dispatchGameStart);
    socket.on(SocketEvents.GAME_START, fetchCurrentGames);
    socket.on(SocketEvents.LOBBY_CHANGED, fetchCurrentGames);
    return () => {
      socket.off(SocketEvents.GAME_START, dispatchGameStart);
      socket.off(SocketEvents.GAME_START, fetchCurrentGames);
      socket.off(SocketEvents.LOBBY_CHANGED, fetchCurrentGames);
    };
  }, [fetchCurrentGames]);

  const myActiveGames = currentGames.filter((g) => g.status === 'active');

  return { currentGames, myActiveGames };
}
