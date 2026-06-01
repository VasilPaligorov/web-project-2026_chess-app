import type { Game } from '../../../../../shared/types';
import { relativeTime } from '../lobby.utils';
import styles from './LobbyHero.module.css';

interface Props {
  myWaitingGame: Game | null;
  inActiveGame: boolean;
  creating: boolean;
  cancellingId: string | null;
  onCreate: () => void;
  onEnterMyGame: (id: string) => void;
  onCancel: (id: string) => void;
}

export function LobbyHero({
  myWaitingGame,
  inActiveGame,
  creating,
  cancellingId,
  onCreate,
  onEnterMyGame,
  onCancel,
}: Props) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroLeft}>
        <p className={styles.eyebrow}>Folio Nº III · The Lobby</p>
        <h1 className={styles.title}>
          Open <span className={styles.titleAccent}>games.</span>
        </h1>
        <p className={styles.lede}>
          Each entry below seeks an opponent. Take a seat, or set your own table.
        </p>
      </div>

      <div className={styles.heroRight}>
        {myWaitingGame ? (
          <MyGameCard
            game={myWaitingGame}
            cancelling={cancellingId === myWaitingGame._id}
            onEnter={() => onEnterMyGame(myWaitingGame._id)}
            onCancel={() => onCancel(myWaitingGame._id)}
          />
        ) : (
          <CreateButton creating={creating} disabled={inActiveGame} onClick={onCreate} />
        )}
      </div>
    </header>
  );
}

interface CreateButtonProps {
  creating: boolean;
  disabled: boolean;
  onClick: () => void;
}

function CreateButton({ creating, disabled, onClick }: CreateButtonProps) {
  const label = disabled
    ? 'Currently in a match'
    : creating
      ? 'Setting board…'
      : 'Begin a new game';

  return (
    <button type="button" className={styles.createBtn} onClick={onClick} disabled={creating || disabled}>
      {label}
    </button>
  );
}

interface MyGameCardProps {
  game: Game;
  cancelling: boolean;
  onEnter: () => void;
  onCancel: () => void;
}

function MyGameCard({ game, cancelling, onEnter, onCancel }: MyGameCardProps) {
  return (
    <div className={styles.myGame}>
      <p className={styles.myGameLabel}>Your table is set.</p>
      <p className={styles.myGameMeta}>
        <span className={`${styles.elo} tnum`}>{game.whitePlayer.elo}</span>
        <span className={styles.dot}>·</span>
        <span className={styles.timestamp}>opened {relativeTime(game.createdAt)}</span>
      </p>
      <div className={styles.myGameActions}>
        <button type="button" className={styles.openBtn} onClick={onEnter}>
          Enter
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={cancelling}>
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
