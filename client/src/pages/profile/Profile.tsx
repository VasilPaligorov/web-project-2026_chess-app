import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ProfileHero } from './components/ProfileHero';
import { StatsGrid } from './components/StatsGrid';
import { GameRow } from './components/GameRow';
import { useProfile } from './useProfile';
import styles from './Profile.module.css';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const me = useAuthStore((s) => s.user);

  const { user, games, error } = useProfile(userId);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p className={styles.eyebrow}>Notice</p>
          <h2 className={styles.errorHeading}>{error}</h2>
          <Link to="/lobby" className={styles.linkBack}>
            ← Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading profile…</p>
      </div>
    );
  }

  const isMe = me?._id === user._id;

  return (
    <div className={styles.page}>
      <ProfileHero user={user} isMe={isMe} />
      <StatsGrid user={user} />

      <section className={styles.list}>
        <header className={styles.listHeader}>
          <span className={styles.listLabel}>Recent matches</span>
          <span className={`${styles.listCount} tnum`}>
            {games ? games.length.toString().padStart(2, '0') : '—'}
          </span>
        </header>

        {games === null && <p className={styles.empty}>Reading the wire…</p>}

        {games && games.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyGlyph} aria-hidden="true">♟</span>
            <p className={styles.emptyHeading}>No matches yet.</p>
          </div>
        )}

        {games && games.length > 0 && (
          <ul className={styles.rows}>
            {games.map((g, i) => (
              <GameRow
                key={g._id}
                game={g}
                index={i}
                viewerId={user._id}
                isExpanded={expandedGameId === g._id}
                onToggle={() =>
                  setExpandedGameId(expandedGameId === g._id ? null : g._id)
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
