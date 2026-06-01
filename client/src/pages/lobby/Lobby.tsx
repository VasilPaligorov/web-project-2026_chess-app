import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useWaitingGames } from '../../hooks/useWaitingGames';
import type { Game } from '../../../../shared/types';
import { ResumeBanner } from './components/ResumeBanner';
import { LobbyHero } from './components/LobbyHero';
import { WaitingGamesList } from './components/WaitingGamesList';
import { pickError } from './lobby.utils';
import styles from './Lobby.module.css';

interface GameResponse { success: boolean; message?: string; data?: Game }
interface CurrentGameResponse { success: boolean; data: Game | null }

export default function Lobby() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { games, error: listError, refresh } = useWaitingGames();

  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const myWaitingGame = games?.find((g) => g.whitePlayer._id === user?._id) ?? null;
  const myActiveGame = currentGame?.status === 'active' ? currentGame : null;

  const fetchCurrentGame = useCallback(async () => {
    try {
      const { data } = await api.get<CurrentGameResponse>('/api/games/me/current');
      if (data.success) setCurrentGame(data.data);
    } catch {
      /* best-effort */
    }
  }, []);

  useEffect(() => {
    fetchCurrentGame();
    const socket = getSocket();
    const onGameStart = (game: Game) => navigate(`/game/${game._id}`);
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
      {myActiveGame && (
        <ResumeBanner game={myActiveGame} onResume={() => navigate(`/game/${myActiveGame._id}`)} />
      )}

      <LobbyHero
        myWaitingGame={myWaitingGame}
        inActiveGame={!!myActiveGame}
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

      <WaitingGamesList
        games={games}
        currentUserId={user?._id}
        joiningId={joiningId}
        cancellingId={cancellingId}
        onJoin={handleJoin}
        onCancel={handleCancel}
      />
    </div>
  );
}
