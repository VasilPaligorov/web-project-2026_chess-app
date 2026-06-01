import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useWaitingGames } from '../../hooks/useWaitingGames';
import type { Game } from '../../../../shared/types';
import { ActiveGamesList } from './components/ActiveGamesList';
import { LobbyHero } from './components/LobbyHero';
import { WaitingGamesList } from './components/WaitingGamesList';
import { pickError } from './lobby.utils';
import styles from './Lobby.module.css';

interface GameResponse { success: boolean; message?: string; data?: Game }
interface CurrentGamesResponse { success: boolean; data: Game[] }

export default function Lobby() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { games, error: listError, refresh } = useWaitingGames();

  const [currentGames, setCurrentGames] = useState<Game[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const myWaitingGame = games?.find((g) => g.whitePlayer._id === user?._id) ?? null;
  const myActiveGames = currentGames.filter((g) => g.status === 'active');

  const fetchCurrentGames = useCallback(async () => {
    try {
      const { data } = await api.get<CurrentGamesResponse>('/api/games/me/current');
      if (data.success) setCurrentGames(data.data);
    } catch {
      /* best-effort */
    }
  }, []);

  useEffect(() => {
    fetchCurrentGames();
    const socket = getSocket();
    // Auto-navigate the lobby into the game when an opponent joins one of our
    // waiting games — fires on `game:start` emitted to the user room.
    const onGameStart = (game: Game) => navigate(`/game/${game._id}`);
    socket.on('game:start', onGameStart);
    socket.on('game:start', fetchCurrentGames);
    socket.on('lobby:changed', fetchCurrentGames);
    return () => {
      socket.off('game:start', onGameStart);
      socket.off('game:start', fetchCurrentGames);
      socket.off('lobby:changed', fetchCurrentGames);
    };
  }, [navigate, fetchCurrentGames]);

  const handleCreate = async () => {
    setActionError(null);
    setCreating(true);
    try {
      const { data } = await api.post<GameResponse>('/api/games');
      if (data.success && data.data) navigate(`/game/${data.data._id}`);
      else setActionError(data.message ?? 'Could not create game');
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
      // On success the server emits `game:start` to both players;
      // the listener above will navigate this client to /game/:id.
      const { data } = await api.post<GameResponse>(`/api/games/${id}/join`);
      if (!data.success) setActionError(data.message ?? 'Could not join game');
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
      <LobbyHero
        myWaitingGame={myWaitingGame}
        creating={creating}
        cancellingId={cancellingId}
        onCreate={handleCreate}
        onEnterMyGame={(id) => navigate(`/game/${id}`)}
        onCancel={handleCancel}
      />

      {(actionError || listError) && (
        <div className={styles.error} role="alert">
          <span className={styles.errorTag}>Notice</span>
          <span>{actionError ?? listError}</span>
        </div>
      )}

      <div className={styles.spread}>
        <ActiveGamesList
          games={myActiveGames}
          currentUserId={user?._id}
          onResume={(id) => navigate(`/game/${id}`)}
        />
        <div className={styles.gutter} aria-hidden="true" />
        <WaitingGamesList
          games={games}
          currentUserId={user?._id}
          joiningId={joiningId}
          cancellingId={cancellingId}
          onJoin={handleJoin}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
