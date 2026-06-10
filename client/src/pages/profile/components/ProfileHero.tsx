import type { UserStats } from '../../../../../shared/types';
import { formatMonth } from '../profile.utils';
import styles from './ProfileHero.module.css';

interface Props {
  user: UserStats;
  isMe: boolean;
  onEdit?: () => void;
}

export function ProfileHero({ user, isMe, onEdit }: Props) {
  return (
    <header className={styles.hero}>
      <p className={styles.eyebrow}>
        Folio Nº IV · {isMe ? 'You' : 'Player'}
      </p>
      <h1 className={styles.name}>
        {user.username}
        {isMe && <span className={styles.youTag}>You</span>}
      </h1>
      <p className={styles.heroMeta}>
        <span className={`${styles.heroElo} tnum`}>{user.elo}</span>
        <span className={styles.heroEloLabel}>elo</span>
        <span className={styles.dot}>·</span>
        <span className={styles.joined}>joined {formatMonth(user.createdAt)}</span>
      </p>
      {onEdit && (
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          Edit profile
        </button>
      )}
    </header>
  );
}
