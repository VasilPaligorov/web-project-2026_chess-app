import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Game, UserStats } from '../../../../shared/types';
import styles from './Profile.module.css';

interface UserResponse {
  success: boolean;
  data: UserStats;
}
interface GamesResponse {
  success: boolean;
  data: Game[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

function pct(wins: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((wins / total) * 100)}%`;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const me = useAuthStore((s) => s.user);

  const [user, setUser] = useState<UserStats | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setError(null);
    setUser(null);
    setGames(null);

    Promise.all([
      api.get<UserResponse>(`/api/users/${userId}`),
      api.get<GamesResponse>(`/api/users/${userId}/games?limit=10`),
    ])
      .then(([u, g]) => {
        if (cancelled) return;
        if (u.data.success) setUser(u.data.data);
        if (g.data.success) setGames(g.data.data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('Player not found');
        } else {
          setError('Could not load profile');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  const total = user.wins + user.losses + user.draws;
  const isMe = me?._id === user._id;

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
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
      </header>

      {/* ── Stats ── */}
      <section className={styles.statsGrid}>
        <Stat label="Wins" value={user.wins} accent="oxblood" />
        <Stat label="Losses" value={user.losses} />
        <Stat label="Draws" value={user.draws} />
        <Stat label="Win rate" value={pct(user.wins, total)} />
        <Stat label="Peak" value={user.peakElo} />
        <Stat label="Total" value={total} />
      </section>

      {/* ── Recent games ── */}
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
            {games.map((g, i) => {
              const myColor: 'white' | 'black' =
                g.whitePlayer._id === user._id ? 'white' : 'black';
              const opponent = myColor === 'white' ? g.blackPlayer : g.whitePlayer;
              const outcome =
                g.result === 'draw'
                  ? 'draw'
                  : g.result === myColor
                    ? 'win'
                    : 'loss';
              return (
                <li key={g._id} className={styles.row}>
                  <span className={`${styles.rowNumber} tnum`}>
                    {(i + 1).toString().padStart(2, '0')}.
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
                      {g.endReason && (
                        <>
                          <span className={styles.dot}>·</span>
                          <span className={styles.reason}>
                            {g.endReason.replace(/_/g, ' ')}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className={styles.rowAction}>
                    <span className={styles.rowDate}>
                      {g.finishedAt ? formatDate(g.finishedAt) : ''}
                    </span>
                    {g.spectatorToken && (
                      <Link
                        to={`/spectate/${g.spectatorToken}`}
                        className={styles.reviewLink}
                      >
                        Review →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
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
