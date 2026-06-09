import type { Game } from '../../../../../shared/types';
import styles from './GameHeader.module.css';

interface Props {
  game: Game;
  spectatorEnabled: boolean;
  onShareClick: () => void;
}

export function GameHeader({ game, spectatorEnabled, onShareClick }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.headerMeta}>
        <p className={styles.eyebrow}>
          Match <span className={styles.folioNum}>Nº {String(game._id).slice(-4).toUpperCase()}</span>
        </p>
        <h1 className={styles.title}>
          <span className={styles.player}>
            {game.whitePlayer.username}
            <span className={`${styles.playerElo} tnum`}>{game.whitePlayer.elo}</span>
          </span>
          <span className={styles.vs}>vs</span>
          <span className={styles.player}>
            {game.blackPlayer?.username ?? '—'}
            {game.blackPlayer && (
              <span className={`${styles.playerElo} tnum`}>{game.blackPlayer.elo}</span>
            )}
          </span>
        </h1>
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.shareBtn}
          onClick={onShareClick}
          disabled={!spectatorEnabled}
        >
          Share link
        </button>
      </div>
    </header>
  );
}
