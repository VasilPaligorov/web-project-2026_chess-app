import type { Game, GameOverPayload } from '../../../../../shared/types';
import { REASON_COPY, winnerNameFor } from '../game.utils';
import styles from './GameOverOverlay.module.css';

interface Props {
  game: Game;
  payload: GameOverPayload;
  onBack: () => void;
}

/** Renders over the board once a game has finished (any result + reason). */
export function GameOverOverlay({ game, payload, onBack }: Props) {
  const winnerName = winnerNameFor(game, payload);
  return (
    <div className={styles.overlay}>
      <p className={styles.eyebrow}>Match concluded</p>
      <p className={styles.headline}>
        {payload.winner === 'draw' ? (
          'Drawn'
        ) : (
          <>
            <span className={styles.winner}>{winnerName}</span>{' '}
            <span className={styles.wins}>wins</span>
          </>
        )}
      </p>
      <p className={styles.reason}>{REASON_COPY[payload.reason]}</p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={onBack}>
          Back to lobby
        </button>
      </div>
    </div>
  );
}
