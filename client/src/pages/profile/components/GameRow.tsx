import type { Game } from '../../../../../shared/types';
import { ReplayViewer } from './ReplayViewer';
import { formatDate } from '../profile.utils';
import styles from './GameRow.module.css';

interface Props {
  game: Game;
  index: number;
  viewerId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function GameRow({ game, index, viewerId, isExpanded, onToggle }: Props) {
  const myColor: 'white' | 'black' =
    game.whitePlayer._id === viewerId ? 'white' : 'black';
  const opponent = myColor === 'white' ? game.blackPlayer : game.whitePlayer;
  const outcome =
    game.result === 'draw' ? 'draw' : game.result === myColor ? 'win' : 'loss';

  return (
    <li className={styles.row}>
      <div className={styles.rowGrid}>
        <span className={`${styles.rowNumber} tnum`}>
          {(index + 1).toString().padStart(2, '0')}.
        </span>
        <div className={styles.rowMeta}>
          <p className={styles.rowOpp}>
            <span className={styles.colorBadge}>{myColor === 'white' ? '♔' : '♚'}</span>
            vs {opponent?.username ?? '—'}
            {opponent && (
              <span className={`${styles.oppElo} tnum`}>{opponent.elo}</span>
            )}
          </p>
          <p className={styles.rowDetails}>
            <span className={`${styles.outcome} ${styles[`outcome_${outcome}`]}`}>
              {outcome.toUpperCase()}
            </span>
            {game.endReason && (
              <>
                <span className={styles.dot}>·</span>
                <span className={styles.reason}>
                  {game.endReason.replace(/_/g, ' ')}
                </span>
              </>
            )}
          </p>
        </div>
        <div className={styles.rowAction}>
          <span className={styles.rowDate}>
            {game.finishedAt ? formatDate(game.finishedAt) : ''}
          </span>
          <button
            type="button"
            className={styles.reviewBtn}
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={`replay-${game._id}`}
          >
            {isExpanded ? 'Close replay' : 'Open replay →'}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div id={`replay-${game._id}`}>
          <ReplayViewer game={game} viewerColor={myColor} onClose={onToggle} />
        </div>
      )}
    </li>
  );
}
