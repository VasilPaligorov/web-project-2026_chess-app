import type { Game } from '../../../../../shared/types';
import { turnFromFen } from '../../game/game.utils';
import { relativeTime } from '../lobby.utils';
import styles from './ActiveGamesList.module.css';

interface Props {
  games: Game[];
  currentUserId: string | undefined;
  onResume: (id: string) => void;
}

export function ActiveGamesList({ games, currentUserId, onResume }: Props) {
  return (
    <section className={styles.list} aria-label="Your matches in progress">
      <header className={styles.header}>
        <span className={styles.label}>In progress</span>
        <span className={`${styles.count} tnum`}>
          {games.length.toString().padStart(2, '0')}
        </span>
      </header>

      {games.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className={styles.rows}>
          {games.map((g, i) => (
            <GameRow
              key={g._id}
              game={g}
              index={i}
              currentUserId={currentUserId}
              onResume={() => onResume(g._id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyGlyph} aria-hidden="true">♔</span>
      <p className={styles.emptyHeading}>Nothing in play.</p>
      <p className={styles.emptyHint}>Take a seat across the page.</p>
    </div>
  );
}

interface RowProps {
  game: Game;
  index: number;
  currentUserId: string | undefined;
  onResume: () => void;
}

function GameRow({ game, index, currentUserId, onResume }: RowProps) {
  // The opponent is the player who isn't us. If we're white, opponent is black,
  // and vice versa. Fallbacks shouldn't happen in 'active' games (both seats filled)
  // but we guard for safety so the UI never blanks out.
  const iAmWhite = game.whitePlayer._id === currentUserId;
  const opponent = iAmWhite ? game.blackPlayer : game.whitePlayer;

  const fenTurn = turnFromFen(game.fen);
  const myTurn =
    (fenTurn === 'w' && iAmWhite) || (fenTurn === 'b' && !iAmWhite);

  return (
    <li className={styles.row}>
      <span className={`${styles.rowNumber} tnum`}>
        {(index + 1).toString().padStart(2, '0')}.
      </span>
      <div className={styles.rowMeta}>
        <p className={styles.rowName}>
          <span className={styles.vsTag}>vs</span>
          {opponent?.username ?? '—'}
        </p>
        <p className={styles.rowDetails}>
          {opponent && (
            <>
              <span className={`${styles.elo} tnum`}>{opponent.elo}</span>
              <span className={styles.dot}>·</span>
            </>
          )}
          <span
            className={`${styles.turn} ${myTurn ? styles.turnMine : styles.turnTheirs}`}
          >
            {myTurn ? 'your move' : 'their move'}
          </span>
          <span className={styles.dot}>·</span>
          <span className={styles.timestamp}>{relativeTime(game.createdAt)}</span>
        </p>
      </div>
      <div className={styles.rowAction}>
        <button type="button" className={styles.resumeBtn} onClick={onResume}>
          Resume →
        </button>
      </div>
    </li>
  );
}
