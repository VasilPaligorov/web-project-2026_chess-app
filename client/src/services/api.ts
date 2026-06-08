import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? '';
    const isAuthAttempt = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (err.response?.status === 401 && !isAuthAttempt) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export default api;

export function getErrorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? err.response.data.message
    : fallback;
}
