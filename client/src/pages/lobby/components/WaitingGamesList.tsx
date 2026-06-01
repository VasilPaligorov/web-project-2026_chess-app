import type { Game } from '../../../../../shared/types';
import { relativeTime } from '../lobby.utils';
import styles from './WaitingGamesList.module.css';

interface Props {
  games: Game[] | null;
  currentUserId: string | undefined;
  joiningId: string | null;
  cancellingId: string | null;
  onJoin: (id: string) => void;
  onCancel: (id: string) => void;
}

export function WaitingGamesList({
  games,
  currentUserId,
  joiningId,
  cancellingId,
  onJoin,
  onCancel,
}: Props) {
  return (
    <section className={styles.list}>
      <header className={styles.header}>
        <span className={styles.label}>Awaiting opponents</span>
        <span className={`${styles.count} tnum`}>
          {games ? games.length.toString().padStart(2, '0') : '—'}
        </span>
      </header>

      {games === null && <p className={styles.empty}>Reading the wire…</p>}
      {games && games.length === 0 && <EmptyState />}

      {games && games.length > 0 && (
        <ul className={styles.rows}>
          {games.map((g, i) => (
            <GameRow
              key={g._id}
              game={g}
              index={i}
              mine={g.whitePlayer._id === currentUserId}
              joining={joiningId === g._id}
              cancelling={cancellingId === g._id}
              onJoin={() => onJoin(g._id)}
              onCancel={() => onCancel(g._id)}
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
      <span className={styles.emptyGlyph} aria-hidden="true">♟</span>
      <p className={styles.emptyHeading}>No tables set.</p>
      <p className={styles.emptyHint}>Be the first to sit down.</p>
    </div>
  );
}

interface RowProps {
  game: Game;
  index: number;
  mine: boolean;
  joining: boolean;
  cancelling: boolean;
  onJoin: () => void;
  onCancel: () => void;
}

function GameRow({ game, index, mine, joining, cancelling, onJoin, onCancel }: RowProps) {
  return (
    <li className={`${styles.row} ${mine ? styles.rowMine : ''}`}>
      <span className={`${styles.rowNumber} tnum`}>
        {(index + 1).toString().padStart(2, '0')}.
      </span>
      <div className={styles.rowMeta}>
        <p className={styles.rowName}>
          {game.whitePlayer.username}
          {mine && <span className={styles.youTag}>You</span>}
        </p>
        <p className={styles.rowDetails}>
          <span className={`${styles.elo} tnum`}>{game.whitePlayer.elo}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.timestamp}>opened {relativeTime(game.createdAt)}</span>
        </p>
      </div>
      <div className={styles.rowAction}>
        {mine ? (
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        ) : (
          <button type="button" className={styles.joinBtn} onClick={onJoin} disabled={joining}>
            {joining ? 'Joining…' : 'Sit down'}
          </button>
        )}
      </div>
    </li>
  );
}
