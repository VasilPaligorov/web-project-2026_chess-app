import { useEffect, useRef, useState } from 'react';
import type { Game } from '../../../../../shared/types';
import styles from './GameHeader.module.css';

interface Props {
  game: Game;
  spectatorEnabled: boolean;
  onShareClick: () => void;
}

/**
 * Top of the game page: the match-number eyebrow, the two player names with
 * elos, and the kebab menu that opens the spectator share modal. Owns the
 * menu's open/close state and the click-outside listener — no other component
 * needs it.
 */
export function GameHeader({ game, spectatorEnabled, onShareClick }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleShareClick = () => {
    onShareClick();
    setMenuOpen(false);
  };

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
        <div className={styles.menu} ref={menuRef}>
          <button
            type="button"
            className={styles['menu-trigger']}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Game options"
            disabled={!spectatorEnabled}
          >
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </button>
          {menuOpen && (
            <div className={styles['menu-dropdown']}>
              <button
                type="button"
                className={styles['menu-item']}
                onClick={handleShareClick}
              >
                Share spectator link
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
