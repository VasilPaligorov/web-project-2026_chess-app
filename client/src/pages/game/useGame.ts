import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import axios from 'axios';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import {
  SocketEvents,
  type DrawDeclinedPayload,
  type DrawOfferPayload,
  type Game,
  type GameOverPayload,
  type Move,
  type MoveErrorPayload,
  type MoveUpdatePayload,
} from '../../../../shared/types';
import { getMyColor, turnFromFen, type Color } from './game.utils';

interface UseGameResult {
  game: Game | null;
  fen: string;
  pageError: string | null;
  actionMsg: string | null;
  gameOver: GameOverPayload | null;
  incomingDraw: DrawOfferPayload | null;
  drawPending: boolean;
  myColor: Color | null;
  opponent: Game['whitePlayer'] | null;
  isMyTurn: boolean;
  announce: (msg: string) => void;
  tryMove: (move: Move) => boolean;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
}

export function useGame(gameId: string | undefined): UseGameResult {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const chessRef = useRef(new Chess());
  const [game, setGame] = useState<Game | null>(null);
  const [fen, setFen] = useState<string>(chessRef.current.fen());
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [incomingDraw, setIncomingDraw] = useState<DrawOfferPayload | null>(null);
  const [drawPending, setDrawPending] = useState(false);

  const myColor = useMemo(() => getMyColor(game, user?._id), [game, user?._id]);

  const opponent = game && myColor
    ? (myColor === 'white' ? game.blackPlayer : game.whitePlayer)
    : null;

  const isMyTurn = useMemo(() => {
    if (!myColor || game?.status !== 'active') return false;
    const turn = turnFromFen(fen);
    return (turn === 'w' && myColor === 'white') || (turn === 'b' && myColor === 'black');
  }, [fen, myColor, game?.status]);

  useEffect(() => {
    try {
      chessRef.current.load(fen);
    } catch {}
  }, [fen]);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;
    const socket = getSocket();

    const onMoveUpdate = (payload: MoveUpdatePayload) => {
      if (payload.gameId !== gameId) return;
      setFen(payload.fen);
    };
    const onGameOver = (payload: GameOverPayload) => {
      if (payload.gameId !== gameId) return;
      setGameOver(payload);
      setDrawPending(false);
      setIncomingDraw(null);
      api
        .get<{ success: boolean; data: { user: typeof user } }>('/api/auth/me')
        .then(({ data }) => {
          if (data.success && data.data.user) setUser(data.data.user);
        })
        .catch(() => {});
    };
    const onMoveError = (payload: MoveErrorPayload) => {
      if (payload?.gameId !== gameId) return;
      setActionMsg(payload.message ?? 'Illegal move');
    };
    const onDrawOffer = (payload: DrawOfferPayload) => {
      if (payload?.gameId !== gameId) return;
      setIncomingDraw(payload);
    };
    const onDrawDeclined = (payload: DrawDeclinedPayload) => {
      if (payload?.gameId !== gameId) return;
      setDrawPending(false);
      setActionMsg('Draw declined');
    };
    const onGameStart = (payload: Game) => {
      if (payload?._id !== gameId) return;
      fetchGame();
    };

    const fetchGame = () => {
      api
        .get<{ success: boolean; data: Game }>(`/api/games/${gameId}`)
        .then(({ data }) => {
          if (cancelled || !data.success) return;
          setGame(data.data);
          setFen(data.data.fen);
          if (data.data.status === 'finished' && data.data.result && data.data.endReason) {
            setGameOver({
              gameId: data.data._id,
              winner: data.data.result,
              reason: data.data.endReason,
            });
          }
        })
        .catch((err) => {
          if (cancelled) return;
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setPageError('Game not found');
          } else {
            setPageError('Could not load game');
          }
        });
    };

    let wasConnected = socket.connected;
    const onConnect = () => {
      socket.emit(SocketEvents.GAME_JOIN, gameId);
      if (wasConnected) fetchGame();
      wasConnected = true;
    };

    socket.on('connect', onConnect);
    socket.on(SocketEvents.MOVE_UPDATE, onMoveUpdate);
    socket.on(SocketEvents.GAME_OVER, onGameOver);
    socket.on(SocketEvents.MOVE_ERROR, onMoveError);
    socket.on(SocketEvents.DRAW_OFFER, onDrawOffer);
    socket.on(SocketEvents.DRAW_DECLINED, onDrawDeclined);
    socket.on(SocketEvents.GAME_START, onGameStart);

    socket.emit(SocketEvents.GAME_JOIN, gameId);
    fetchGame();

    return () => {
      cancelled = true;
      socket.off('connect', onConnect);
      socket.off(SocketEvents.MOVE_UPDATE, onMoveUpdate);
      socket.off(SocketEvents.GAME_OVER, onGameOver);
      socket.off(SocketEvents.MOVE_ERROR, onMoveError);
      socket.off(SocketEvents.DRAW_OFFER, onDrawOffer);
      socket.off(SocketEvents.DRAW_DECLINED, onDrawDeclined);
      socket.off(SocketEvents.GAME_START, onGameStart);
      socket.emit(SocketEvents.GAME_LEAVE, gameId);
    };
  }, [gameId, user?._id, setUser]);

  useEffect(() => {
    if (!actionMsg) return;
    const id = setTimeout(() => setActionMsg(null), 3000);
    return () => clearTimeout(id);
  }, [actionMsg]);

  const announce = useCallback((msg: string) => setActionMsg(msg), []);

  const tryMove = useCallback(
    (move: Move): boolean => {
      if (!gameId || game?.status !== 'active' || !isMyTurn) return false;
      const probe = new Chess(chessRef.current.fen());
      try {
        probe.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
      } catch {
        return false;
      }
      setFen(probe.fen());
      getSocket().emit(SocketEvents.MOVE_MAKE, { gameId, move });
      return true;
    },
    [gameId, game?.status, isMyTurn],
  );

  const resign = useCallback(() => {
    if (!gameId) return;
    getSocket().emit(SocketEvents.GAME_RESIGN, gameId);
  }, [gameId]);

  const offerDraw = useCallback(() => {
    if (!gameId || drawPending) return;
    getSocket().emit(SocketEvents.DRAW_OFFER, gameId);
    setDrawPending(true);
    setActionMsg('Draw offer sent');
  }, [gameId, drawPending]);

  const acceptDraw = useCallback(() => {
    if (!gameId) return;
    getSocket().emit(SocketEvents.DRAW_ACCEPT, gameId);
    setIncomingDraw(null);
  }, [gameId]);

  const declineDraw = useCallback(() => {
    if (!gameId) return;
    getSocket().emit(SocketEvents.DRAW_DECLINE, gameId);
    setIncomingDraw(null);
  }, [gameId]);

  return {
    game,
    fen,
    pageError,
    actionMsg,
    gameOver,
    incomingDraw,
    drawPending,
    myColor,
    opponent,
    isMyTurn,
    announce,
    tryMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
  };
}
