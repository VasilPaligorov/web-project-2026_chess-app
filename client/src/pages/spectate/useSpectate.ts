import { useEffect, useState } from 'react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  SocketEvents,
  type Game,
  type GameOverPayload,
  type MoveUpdatePayload,
} from '../../../../shared/types';

export interface UseSpectateResult {
  game: Game | null;
  fen: string;
  result: GameOverPayload | null;
  error: string | null;
}

export function useSpectate(token: string | undefined): UseSpectateResult {
  const [game, setGame] = useState<Game | null>(null);
  const [fen, setFen] = useState<string>('start');
  const [result, setResult] = useState<GameOverPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let started = false;
    let knownGameId: string | null = null;
    let pendingMove: MoveUpdatePayload | null = null;
    let pendingGameOver: GameOverPayload | null = null;

    const socket = getSocket();
    const onGameStart = (startedGame: Game) => {
      if (startedGame.spectatorToken !== token) return;
      started = true;
      knownGameId = startedGame._id;
      setGame(startedGame);
      setFen(startedGame.fen);
    };
    const onMoveUpdate = (payload: MoveUpdatePayload) => {
      if (!knownGameId) {
        pendingMove = payload;
        return;
      }
      if (payload.gameId === knownGameId) setFen(payload.fen);
    };
    const onGameOver = (payload: GameOverPayload) => {
      if (!knownGameId) {
        pendingGameOver = payload;
        return;
      }
      if (payload.gameId === knownGameId) setResult(payload);
    };

    const fetchGame = () => {
      api
        .get<{ success: boolean; data: Game }>(`/api/games/spectate/${token}`)
        .then(({ data }) => {
          if (cancelled) return;
          if (!data.success) {
            setError('Game not found');
            return;
          }
          const fetched = data.data;
          if (started && fetched.status === 'waiting') return;
          knownGameId = fetched._id;
          setGame(fetched);
          if (pendingMove && pendingMove.gameId === fetched._id) {
            setFen(pendingMove.fen);
          } else {
            setFen(fetched.fen);
          }
          if (pendingGameOver && pendingGameOver.gameId === fetched._id) {
            setResult(pendingGameOver);
          } else if (fetched.status === 'finished' && fetched.result && fetched.endReason) {
            setResult({ gameId: fetched._id, winner: fetched.result, reason: fetched.endReason });
          }
          pendingMove = null;
          pendingGameOver = null;
        })
        .catch(() => {
          if (!cancelled) setError('Game not found');
        });
    };

    let wasConnected = socket.connected;
    const onConnect = () => {
      socket.emit(SocketEvents.SPECTATOR_JOIN, token);
      if (wasConnected) fetchGame();
      wasConnected = true;
    };

    socket.on('connect', onConnect);
    socket.on(SocketEvents.GAME_START, onGameStart);
    socket.on(SocketEvents.MOVE_UPDATE, onMoveUpdate);
    socket.on(SocketEvents.GAME_OVER, onGameOver);

    socket.emit(SocketEvents.SPECTATOR_JOIN, token);
    fetchGame();

    return () => {
      cancelled = true;
      socket.off('connect', onConnect);
      socket.off(SocketEvents.GAME_START, onGameStart);
      socket.off(SocketEvents.MOVE_UPDATE, onMoveUpdate);
      socket.off(SocketEvents.GAME_OVER, onGameOver);
      socket.emit(SocketEvents.SPECTATOR_LEAVE, token);
    };
  }, [token]);

  return { game, fen, result, error };
}
