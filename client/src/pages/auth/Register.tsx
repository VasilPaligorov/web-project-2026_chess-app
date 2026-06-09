import { useState, SubmitEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthResponse } from '../../../../shared/types';
import PasswordInput from './PasswordInput';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import styles from './Auth.module.css';

type RedirectState = { from?: { pathname?: string } } | null;

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);

  const from = (location.state as RedirectState)?.from?.pathname ?? '/lobby';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/register', {
        username,
        email,
        password,
      });
      login(res.data.data.user, res.data.data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>♞</div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            Play chess online, track your rating, challenge friends.
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.label}>
            Username
            <input
              className={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className={styles.label}>
            Password
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={6}
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <div className={styles.googleWrap}>
          <GoogleAuthButton label="Sign up with Google" redirectTo={from} onError={setError} />
        </div>

        <div className={styles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
