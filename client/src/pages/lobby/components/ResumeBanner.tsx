import type { Game } from '../../../../../shared/types';
import styles from './ResumeBanner.module.css';

interface Props {
  game: Game;
  onResume: () => void;
}

export function ResumeBanner({ game, onResume }: Props) {
  return (
    <div className={styles.banner} role="status">
      <div className={styles.meta}>
        <p className={styles.eyebrow}>A match in progress</p>
        <p className={styles.title}>
          {game.whitePlayer.username}
          <span className={styles.vs}>vs</span>
          {game.blackPlayer?.username ?? '—'}
        </p>
      </div>
      <button type="button" className={styles.btn} onClick={onResume}>
        Resume →
      </button>
    </div>
  );
}
