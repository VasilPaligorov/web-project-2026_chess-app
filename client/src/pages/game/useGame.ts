import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import axios from 'axios';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import {
  SocketEvents,
  type DrawOfferPayload,
  type Game,
  type GameOverPayload,
  type Move,
  type MoveErrorPayload,
  type MoveUpdatePayload,
} from '../../../../shared/types';
import { getMyColor, turnFromFen, type Color } from './game.utils';

interface UseGameResult {
  // Snapshot
  game: Game | null;
  fen: string;
  pageError: string | null;
  actionMsg: string | null;
  gameOver: GameOverPayload | null;
  incomingDraw: DrawOfferPayload | null;
  drawPending: boolean;
  // Derived
  myColor: Color | null;
  opponent: Game['whitePlayer'] | null;
  isMyTurn: boolean;
  // Actions
  announce: (msg: string) => void;
  tryMove: (move: Move) => boolean;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
}

/**
 * Owns the live state of a single game page: the cached `Game`, the current
 * FEN, the game-over banner, draw-offer flow, and the socket subscription.
 * Mounting the hook fetches `/api/games/:id`, joins the `game:{id}` socket
 * room, and subscribes to MOVE_UPDATE / GAME_OVER / MOVE_ERROR / DRAW_OFFER /
 * DRAW_DECLINED. Unmounting tears the subscriptions down.
 *
 * The chess.js instance lives in a ref (no re-render churn) and is kept in
 * sync with `fen` via a post-render effect.
 */
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

  // ── Derived ────────────────────────────────────────────────────────
  const myColor = useMemo(() => getMyColor(game, user?._id), [game, user?._id]);

  const opponent = game && myColor
    ? (myColor === 'white' ? game.blackPlayer : game.whitePlayer)
    : null;

  const isMyTurn = useMemo(() => {
    if (!myColor || game?.status !== 'active') return false;
    const turn = turnFromFen(fen);
    return (turn === 'w' && myColor === 'white') || (turn === 'b' && myColor === 'black');
  }, [fen, myColor, game?.status]);

  // ── Effects ────────────────────────────────────────────────────────

  // Reflect FEN into the chess.js instance whenever it changes
  useEffect(() => {
    try {
      chessRef.current.load(fen);
    } catch {
      /* malformed FEN — ignore */
    }
  }, [fen]);

  // Fetch the game, join the room, and subscribe. Cancellation guards the
  // initial fetch against an unmount before the response lands.
  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;
    const socket = getSocket();

    const onMoveUpdate = (payload: MoveUpdatePayload) => {
      setFen(payload.fen);
    };
    const onGameOver = (payload: GameOverPayload) => {
      setGameOver(payload);
      setDrawPending(false);
      setIncomingDraw(null);
      // Refresh the cached user so the header's elo/wins/losses updates.
      api
        .get<{ success: boolean; data: { user: typeof user } }>('/api/auth/me')
        .then(({ data }) => {
          if (data.success && data.data.user) setUser(data.data.user);
        })
        .catch(() => {
          /* leave stale; corrects on next login */
        });
    };
    const onMoveError = (payload: MoveErrorPayload) => {
      setActionMsg(payload?.message ?? 'Illegal move');
    };
    const onDrawOffer = (payload: DrawOfferPayload) => {
      setIncomingDraw(payload);
    };
    const onDrawDeclined = () => {
      setDrawPending(false);
      setActionMsg('Draw declined');
    };

    socket.on(SocketEvents.MOVE_UPDATE, onMoveUpdate);
    socket.on(SocketEvents.GAME_OVER, onGameOver);
    socket.on(SocketEvents.MOVE_ERROR, onMoveError);
    socket.on(SocketEvents.DRAW_OFFER, onDrawOffer);
    socket.on(SocketEvents.DRAW_DECLINED, onDrawDeclined);

    api
      .get<{ success: boolean; data: Game }>(`/api/games/${gameId}`)
      .then(({ data }) => {
        if (cancelled || !data.success) return;
        setGame(data.data);
        setFen(data.data.fen);
        if (data.data.status === 'finished' && data.data.result && data.data.endReason) {
          setGameOver({ winner: data.data.result, reason: data.data.endReason });
        }
        socket.emit(SocketEvents.GAME_JOIN, gameId);
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setPageError('Game not found');
        } else {
          setPageError('Could not load game');
        }
      });

    return () => {
      cancelled = true;
      socket.off(SocketEvents.MOVE_UPDATE, onMoveUpdate);
      socket.off(SocketEvents.GAME_OVER, onGameOver);
      socket.off(SocketEvents.MOVE_ERROR, onMoveError);
      socket.off(SocketEvents.DRAW_OFFER, onDrawOffer);
      socket.off(SocketEvents.DRAW_DECLINED, onDrawDeclined);
    };
  }, [gameId, user?._id, setUser]);

  // Fade action message after 3s
  useEffect(() => {
    if (!actionMsg) return;
    const id = setTimeout(() => setActionMsg(null), 3000);
    return () => clearTimeout(id);
  }, [actionMsg]);

  // ── Actions ────────────────────────────────────────────────────────

  const announce = useCallback((msg: string) => setActionMsg(msg), []);

  const tryMove = useCallback(
    (move: Move): boolean => {
      if (!gameId || game?.status !== 'active' || !isMyTurn) return false;
      // Optimistic local validation just for UX (server is authoritative)
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
