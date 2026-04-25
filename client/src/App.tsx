import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Lobby from './pages/lobby/Lobby';

function HomeRedirect() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? '/lobby' : '/login'} replace />;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '6rem 5vw' }}>
      <p className="eyebrow">In progress</p>
      <h2 style={{ marginTop: '0.5rem' }}>{title}</h2>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<PlaceholderPage title="Login" />} />
        <Route path="/register" element={<PlaceholderPage title="Register" />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game/:gameId" element={<PlaceholderPage title="Game" />} />
          <Route path="/profile/:userId" element={<PlaceholderPage title="Profile" />} />
        </Route>

        <Route path="/spectate/:token" element={<PlaceholderPage title="Spectate" />} />
      </Routes>
    </BrowserRouter>
  );
}
