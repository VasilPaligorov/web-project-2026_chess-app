import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { disconnectSocket } from '../services/socket';
import styles from './Layout.module.css';

export default function Layout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* token may already be invalid; clear local state regardless */
    }
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/lobby" className={styles.brand}>
          <span className={styles.brandMark}>♞</span>
          <span className={styles.brandWord}>Head2Head</span>
          <span className={styles.brandTagline}>Est. Twenty‑Six</span>
        </Link>
        <nav className={styles.nav}>
          {user && (
            <>
              <Link to={`/profile/${user._id}`} className={styles.user}>
                <span className={styles.userLabel}>Player</span>
                <span className={styles.userName}>{user.username}</span>
                <span className={`${styles.userElo} tnum`}>{user.elo}</span>
              </Link>
              <button onClick={handleLogout} className={styles.logout}>
                Sign out
              </button>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}