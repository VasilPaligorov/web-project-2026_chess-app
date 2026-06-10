import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { SocketEvents } from '../../../../shared/types';
import type { Game, MoveUpdatePayload, GameOverPayload } from '../../../../shared/types';
import styles from './SpectatorPage.module.css';

export default function SpectatorPage() {
  const { token } = useParams<{ token: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [fen, setFen] = useState<string>('start');
  const [result, setResult] = useState<GameOverPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let knownGameId: string | null = null;
    let pendingMove: MoveUpdatePayload | null = null;
    let pendingOver: GameOverPayload | null = null;

    const socket = getSocket();
    const onMoveUpdate = (payload: MoveUpdatePayload) => {
      if (!knownGameId) {
        pendingMove = payload;
        return;
      }
      if (payload.gameId === knownGameId) setFen(payload.fen);
    };
    const onGameOver = (payload: GameOverPayload) => {
      if (!knownGameId) {
        pendingOver = payload;
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
          const g = data.data;
          knownGameId = g._id;
          setGame(g);
          if (pendingMove && pendingMove.gameId === g._id) {
            setFen(pendingMove.fen);
          } else {
            setFen(g.fen);
          }
          if (pendingOver && pendingOver.gameId === g._id) {
            setResult(pendingOver);
          } else if (g.status === 'finished' && g.result && g.endReason) {
            setResult({ gameId: g._id, winner: g.result, reason: g.endReason });
          }
          pendingMove = null;
          pendingOver = null;
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
    socket.on(SocketEvents.MOVE_UPDATE, onMoveUpdate);
    socket.on(SocketEvents.GAME_OVER, onGameOver);

    socket.emit(SocketEvents.SPECTATOR_JOIN, token);
    fetchGame();

    return () => {
      cancelled = true;
      socket.off('connect', onConnect);
      socket.off(SocketEvents.MOVE_UPDATE, onMoveUpdate);
      socket.off(SocketEvents.GAME_OVER, onGameOver);
      socket.emit(SocketEvents.SPECTATOR_LEAVE, token);
    };
  }, [token]);

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading game…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Spectating</p>
        <h1 className={styles.title}>
          {game.whitePlayer.username}
          <span className={styles.vs}>vs</span>
          {game.blackPlayer?.username ?? '—'}
        </h1>
      </header>

      <div className={styles.boardWrapper}>
        {result && (
          <div className={styles.resultOverlay}>
            <p className={styles.resultText}>
              {result.winner === 'draw'
                ? 'Draw'
                : `${result.winner === 'white' ? game.whitePlayer.username : game.blackPlayer?.username} wins`}
            </p>
            <p className={styles.resultReason}>{result.reason}</p>
          </div>
        )}
        <Chessboard
          options={{
            id: 'spectator-board',
            position: fen,
            allowDragging: false,
          }}
        />
      </div>
    </div>
  );
}
