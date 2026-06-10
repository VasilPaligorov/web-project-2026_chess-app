import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../../services/api';
import type { Game, UserStats } from '../../../../shared/types';

interface UserResponse {
  success: boolean;
  data: UserStats;
}

interface GamesResponse {
  success: boolean;
  data: Game[];
}

interface UseProfileResult {
  user: UserStats | null;
  games: Game[] | null;
  error: string | null;
}

export function useProfile(userId: string | undefined): UseProfileResult {
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

  return { user, games, error };
}
