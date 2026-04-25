import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api from '../services/api';
import type { Game } from '../../../shared/types';

interface ListResponse {
  success: boolean;
  message?: string;
  data?: Game[];
}

export function useWaitingGames(pollMs = 3000) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<ListResponse>('/api/games/waiting');
      if (data.success && data.data) {
        setGames(data.data);
        setError(null);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Could not fetch open games');
      } else {
        setError('Could not fetch open games');
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { games, error, refresh };
}
