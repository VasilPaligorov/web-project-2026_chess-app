import type { UserStats } from '../../../../../shared/types';
import { pct } from '../profile.utils';
import styles from './StatsGrid.module.css';

interface Props {
  user: UserStats;
}

export function StatsGrid({ user }: Props) {
  const total = user.wins + user.losses + user.draws;
  return (
    <section className={styles.statsGrid}>
      <Stat label="Wins" value={user.wins} accent="oxblood" />
      <Stat label="Losses" value={user.losses} />
      <Stat label="Draws" value={user.draws} />
      <Stat label="Win rate" value={pct(user.wins, total)} />
      <Stat label="Peak" value={user.peakElo} />
      <Stat label="Total" value={total} />
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: 'oxblood';
}) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p
        className={`${styles.statValue} tnum ${accent === 'oxblood' ? styles.statValueAccent : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
