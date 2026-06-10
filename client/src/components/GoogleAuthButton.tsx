import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../../../shared/types';
import styles from '../pages/auth/Auth.module.css';

interface Props {
  label: string;
  redirectTo: string;
  onError: (message: string) => void;
}

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function GoogleAuthButton({ label, redirectTo, onError }: Props) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const startLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'email profile',
    onSuccess: async (resp) => {
      try {
        const res = await api.post<AuthResponse>('/api/auth/google', {
          accessToken: resp.access_token,
        });
        login(res.data.data.user, res.data.data.token);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        onError(getErrorMessage(err, 'Google sign-in failed. Please try again.'));
      }
    },
    onError: () => onError('Google sign-in failed. Please try again.'),
  });

  return (
    <button type="button" className={styles.googleBtn} onClick={() => startLogin()}>
      <GoogleIcon />
      {label}
    </button>
  );
}
