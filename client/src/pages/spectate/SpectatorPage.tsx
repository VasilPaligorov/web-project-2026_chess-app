import { useParams } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { REASON_COPY, winnerNameFor } from '../game/game.utils';
import { useSpectate } from './useSpectate';
import styles from './SpectatorPage.module.css';

export default function SpectatorPage() {
  const { token } = useParams<{ token: string }>();
  const { game, fen, result, error } = useSpectate(token);

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
                : `${winnerNameFor(game, result)} wins`}
            </p>
            <p className={styles.resultReason}>{REASON_COPY[result.reason]}</p>
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
