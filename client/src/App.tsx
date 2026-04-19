import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/register" element={<div>Register</div>} />
        <Route path="/lobby" element={<div>Lobby</div>} />
        <Route path="/game/:gameId" element={<div>Game</div>} />
        <Route path="/profile/:userId" element={<div>Profile</div>} />
        <Route path="/spectate/:token" element={<div>Spectate</div>} />
      </Routes>
    </BrowserRouter>
  );
}
