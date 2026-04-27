import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useWaitingGames } from '../../hooks/useWaitingGames';
import type { Game } from '../../../../shared/types';
import styles from './Lobby.module.css';

interface GameResponse {
  success: boolean;
  message?: string;
  data?: Game;
}

interface CurrentGameResponse {
  success: boolean;
  data: Game | null;
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function pickError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function Lobby() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { games, error: listError, refresh } = useWaitingGames();

  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  const myWaitingGame = games?.find((g) => g.whitePlayer._id === user?._id) ?? null;
  const myActiveGame = currentGame?.status === 'active' ? currentGame : null;

  const fetchCurrentGame = useCallback(async () => {
    try {
      const { data } = await api.get<CurrentGameResponse>('/api/games/me/current');
      if (data.success) {
        setCurrentGame(data.data);
      }
    } catch {
      /* best-effort; banner stays hidden on failure */
    }
  }, []);

  useEffect(() => {
    fetchCurrentGame();
    const socket = getSocket();
    const onGameStart = (game: Game) => {
      navigate(`/game/${game._id}`);
    };
    socket.on('game:start', onGameStart);
    socket.on('game:start', fetchCurrentGame);
    socket.on('lobby:changed', fetchCurrentGame);
    return () => {
      socket.off('game:start', onGameStart);
      socket.off('game:start', fetchCurrentGame);
      socket.off('lobby:changed', fetchCurrentGame);
    };
  }, [navigate, fetchCurrentGame]);

  const handleCreate = async () => {
    setActionError(null);
    setCreating(true);
    try {
      const { data } = await api.post<GameResponse>('/api/games');
      if (data.success && data.data) {
        navigate(`/game/${data.data._id}`);
      } else {
        setActionError(data.message ?? 'Could not create game');
      }
    } catch (err) {
      setActionError(pickError(err, 'Could not create game'));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (id: string) => {
    setActionError(null);
    setJoiningId(id);
    try {
      const { data } = await api.post<GameResponse>(`/api/games/${id}/join`);
      if (data.success && data.data) {
        navigate(`/game/${data.data._id}`);
      } else {
        setActionError(data.message ?? 'Could not join game');
      }
    } catch (err) {
      setActionError(pickError(err, 'Could not join game'));
    } finally {
      setJoiningId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionError(null);
    setCancellingId(id);
    try {
      await api.delete(`/api/games/${id}`);
      await refresh();
    } catch (err) {
      setActionError(pickError(err, 'Could not cancel game'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.page}>
      {myActiveGame && (
        <div className={styles.resumeBanner} role="status">
          <div className={styles.resumeMeta}>
            <p className={styles.resumeEyebrow}>A match in progress</p>
            <p className={styles.resumeTitle}>
              {myActiveGame.whitePlayer.username}
              <span className={styles.resumeVs}>vs</span>
              {myActiveGame.blackPlayer?.username ?? '—'}
            </p>
          </div>
          <button
            type="button"
            className={styles.resumeBtn}
            onClick={() => navigate(`/game/${myActiveGame._id}`)}
          >
            Resume →
          </button>
        </div>
      )}

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
            <div className={styles.myGame}>
              <p className={styles.myGameLabel}>Your table is set.</p>
              <p className={styles.myGameMeta}>
                <span className={`${styles.elo} tnum`}>{myWaitingGame.whitePlayer.elo}</span>
                <span className={styles.dot}>·</span>
                <span className={styles.timestamp}>opened {relativeTime(myWaitingGame.createdAt)}</span>
              </p>
              <div className={styles.myGameActions}>
                <button
                  type="button"
                  className={styles.openBtn}
                  onClick={() => navigate(`/game/${myWaitingGame._id}`)}
                >
                  Enter
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => handleCancel(myWaitingGame._id)}
                  disabled={cancellingId === myWaitingGame._id}
                >
                  {cancellingId === myWaitingGame._id ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.createBtn}
              onClick={handleCreate}
              disabled={creating || !!myActiveGame}
            >
              {myActiveGame
                ? 'Currently in a match'
                : creating
                  ? 'Setting board…'
                  : 'Begin a new game'}
            </button>
          )}
        </div>
      </header>

      {(actionError || listError) && (
        <div className={styles.error} role="alert">
          <span className={styles.errorTag}>Notice</span>
          <span>{actionError ?? listError}</span>
        </div>
      )}

      <section className={styles.list}>
        <header className={styles.listHeader}>
          <span className={styles.listLabel}>Awaiting opponents</span>
          <span className={`${styles.listCount} tnum`}>
            {games ? games.length.toString().padStart(2, '0') : '—'}
          </span>
        </header>

        {games === null && <p className={styles.empty}>Reading the wire…</p>}

        {games && games.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyGlyph} aria-hidden="true">♟</span>
            <p className={styles.emptyHeading}>No tables set.</p>
            <p className={styles.emptyHint}>Be the first to sit down.</p>
          </div>
        )}

        {games && games.length > 0 && (
          <ul className={styles.rows}>
            {games.map((g, i) => {
              const mine = g.whitePlayer._id === user?._id;
              return (
                <li key={g._id} className={`${styles.row} ${mine ? styles.rowMine : ''}`}>
                  <span className={`${styles.rowNumber} tnum`}>
                    {(i + 1).toString().padStart(2, '0')}.
                  </span>
                  <div className={styles.rowMeta}>
                    <p className={styles.rowName}>
                      {g.whitePlayer.username}
                      {mine && <span className={styles.youTag}>You</span>}
                    </p>
                    <p className={styles.rowDetails}>
                      <span className={`${styles.elo} tnum`}>{g.whitePlayer.elo}</span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.timestamp}>opened {relativeTime(g.createdAt)}</span>
                    </p>
                  </div>
                  <div className={styles.rowAction}>
                    {mine ? (
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => handleCancel(g._id)}
                        disabled={cancellingId === g._id}
                      >
                        {cancellingId === g._id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.joinBtn}
                        onClick={() => handleJoin(g._id)}
                        disabled={joiningId === g._id}
                      >
                        {joiningId === g._id ? 'Joining…' : 'Sit down'}
                      </button>
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
