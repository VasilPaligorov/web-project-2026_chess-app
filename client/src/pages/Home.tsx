import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { useAuthStore } from '../store/authStore';
import styles from './Home.module.css';

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const [response, setResponse] = useState<string | null>(null);

  async function testConnection() {
    try {
      const res = await axios.get('http://localhost:3000/api/health');
      setResponse(res.data.message);
    } catch {
      setResponse('Failed to connect to server');
    }
  }

  return (
    <div className={styles.page}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>
            Play chess. <span className={styles.titleAccent}>Head to head.</span>
          </h1>
          <p className={styles.tagline}>
            Challenge friends, climb the rating ladder, and watch live games — all in your browser.
          </p>

          <div className={styles.ctaRow}>
            {user ? (
              <Link to="/lobby" className={styles.primary}>
                Enter the lobby
              </Link>
            ) : (
              <>
                <Link to="/register" className={styles.primary}>
                  Create an account
                </Link>
                <Link to="/login" className={styles.secondary}>
                  Log in
                </Link>
              </>
            )}
          </div>

          <div className={styles.health}>
            <button className={styles.healthButton} onClick={testConnection}>
              Test server connection
            </button>
            {response && <div className={styles.healthResult}>{response}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
