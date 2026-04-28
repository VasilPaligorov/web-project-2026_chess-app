import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Lobby from './pages/lobby/Lobby';
import GamePage from './pages/game/GamePage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/profile/:userId" element={<div>Profile (P4)</div>} />
        </Route>

        <Route path="/spectate/:token" element={<div>Spectate (P5)</div>} />
      </Routes>
    </BrowserRouter>
  );
}
