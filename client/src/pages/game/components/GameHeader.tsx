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
          <span>SHARE LINK</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}
