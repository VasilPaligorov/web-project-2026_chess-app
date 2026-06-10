import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.post('/api/auth/logout');
    } catch {}
    logout();
    navigate('/');
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandIcon}>♞</span>
        Head2Head Chess
      </Link>

      <nav className={styles.actions}>
        {user ? (
          <>
            <span className={styles.user}>
              <span className={styles.userName}>{user.username}</span>
              <span className={styles.elo}>{user.elo}</span>
            </span>
            <Link to="/lobby" className={styles.link}>
              Lobby
            </Link>
            <button
              className={styles.logout}
              onClick={onLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.link}>
              Log in
            </Link>
            <Link to="/register" className={styles.cta}>
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
