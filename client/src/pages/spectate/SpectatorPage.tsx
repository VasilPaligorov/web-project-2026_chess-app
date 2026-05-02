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

    // Subscribe to live updates BEFORE fetching, so a move:update arriving
    // mid-flight isn't overwritten by the late initial-state response.
    let receivedLiveUpdate = false;

    const socket = getSocket();
    const onMoveUpdate = (payload: MoveUpdatePayload) => {
      receivedLiveUpdate = true;
      setFen(payload.fen);
    };
    const onGameOver = (payload: GameOverPayload) => setResult(payload);

    socket.on(SocketEvents.MOVE_UPDATE, onMoveUpdate);
    socket.on(SocketEvents.GAME_OVER, onGameOver);
    socket.emit(SocketEvents.SPECTATOR_JOIN, token);

    api
      .get<{ success: boolean; data: Game }>(`/api/games/spectate/${token}`)
      .then(({ data }) => {
        if (data.success) {
          setGame(data.data);
          if (!receivedLiveUpdate) setFen(data.data.fen);
        }
      })
      .catch(() => setError('Game not found'));

    return () => {
      socket.off(SocketEvents.MOVE_UPDATE, onMoveUpdate);
      socket.off(SocketEvents.GAME_OVER, onGameOver);
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
