import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import axios from 'axios';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import {
  SocketEvents,
  type DrawOfferPayload,
  type Game,
  type GameOverPayload,
  type MoveErrorPayload,
  type MoveUpdatePayload,
} from '../../../../shared/types';
import {
  REASON_COPY,
  getMyColor,
  turnFromFen,
  winnerNameFor,
  type Color,
} from './game.utils';
import styles from './GamePage.module.css';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
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
  const [confirmResign, setConfirmResign] = useState(false);

  // Share-modal state (P5 markup preserved)
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derived
  const myColor: Color | null = useMemo(
    () => getMyColor(game, user?._id),
    [game, user?._id],
  );

  const opponent = game && myColor
    ? (myColor === 'white' ? game.blackPlayer : game.whitePlayer)
    : null;

  const isMyTurn = useMemo(() => {
    if (!myColor || game?.status !== 'active') return false;
    const turn = turnFromFen(fen);
    return (turn === 'w' && myColor === 'white') || (turn === 'b' && myColor === 'black');
  }, [fen, myColor, game?.status]);

  const spectatorToken = game?.spectatorToken ?? null;
  const spectatorLink = spectatorToken
    ? `${window.location.origin}/spectate/${spectatorToken}`
    : '';

  // Reflect FEN into the chess.js instance whenever it changes
  useEffect(() => {
    try {
      chessRef.current.load(fen);
    } catch {
      /* malformed FEN — ignore */
    }
  }, [fen]);

  // Fetch and subscribe
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
  }, [gameId, user?._id]);

  // Click outside to close menu
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Cleanup copy timeout on unmount
  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  // Fade action message after 3s
  useEffect(() => {
    if (!actionMsg) return;
    const id = setTimeout(() => setActionMsg(null), 3000);
    return () => clearTimeout(id);
  }, [actionMsg]);

  // Handlers
  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare || !gameId || game?.status !== 'active' || !isMyTurn) return false;
      // Optimistic local validation just for UX (server is authoritative)
      const probe = new Chess(chessRef.current.fen());
      try {
        probe.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      } catch {
        return false;
      }
      getSocket().emit(SocketEvents.MOVE_MAKE, {
        gameId,
        move: { from: sourceSquare, to: targetSquare, promotion: 'q' },
      });
      return true;
    },
    [gameId, game?.status, isMyTurn],
  );

  const handleResign = () => {
    if (!gameId) return;
    getSocket().emit(SocketEvents.GAME_RESIGN, gameId);
    setConfirmResign(false);
  };

  const handleOfferDraw = () => {
    if (!gameId || drawPending) return;
    getSocket().emit(SocketEvents.DRAW_OFFER, gameId);
    setDrawPending(true);
    setActionMsg('Draw offer sent');
  };

  const handleAcceptDraw = () => {
    if (!gameId) return;
    getSocket().emit(SocketEvents.DRAW_ACCEPT, gameId);
    setIncomingDraw(null);
  };

  const handleDeclineDraw = () => {
    if (!gameId) return;
    getSocket().emit(SocketEvents.DRAW_DECLINE, gameId);
    setIncomingDraw(null);
  };

  const handleCancelWaiting = async () => {
    if (!gameId) return;
    try {
      await api.delete(`/api/games/${gameId}`);
      navigate('/lobby');
    } catch {
      setActionMsg('Could not cancel');
    }
  };

  const handleCopy = () => {
    if (!spectatorLink) return;
    navigator.clipboard
      .writeText(spectatorLink)
      .then(() => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopied(true);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  // ── Render ─────────────────────────────────────────────────────────

  if (pageError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p className={styles.eyebrow}>Notice</p>
          <h2 className={styles.errorHeading}>{pageError}</h2>
          <button className={styles.linkBack} onClick={() => navigate('/lobby')}>
            ← Back to lobby
          </button>
        </div>
      </div>
    );
  }

  if (!game || !user) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Setting the board…</p>
      </div>
    );
  }

  const myColorLabel = myColor ? myColor.toUpperCase() : 'SPECTATOR';
  const turnText =
    game.status === 'finished'
      ? 'Game ended'
      : game.status === 'waiting'
        ? 'Awaiting opponent'
        : isMyTurn
          ? 'Your move'
          : `${opponent?.username ?? 'Opponent'} to play`;

  const winnerName = gameOver ? winnerNameFor(game, gameOver) : null;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <p className={styles.eyebrow}>
            Match <span className={styles.folioNum}>Nº {String(game._id).slice(-4).toUpperCase()}</span>
          </p>
          <h1 className={styles.title}>
            <span className={styles.player}>
              {game.whitePlayer.username}
              <span className={`${styles.playerElo} tnum`}>{game.whitePlayer.elo}</span>
            </span>
            <span className={styles.vs}>vs</span>
            <span className={styles.player}>
              {game.blackPlayer?.username ?? '—'}
              {game.blackPlayer && (
                <span className={`${styles.playerElo} tnum`}>{game.blackPlayer.elo}</span>
              )}
            </span>
          </h1>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.menu} ref={menuRef}>
            <button
              type="button"
              className={styles['menu-trigger']}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Game options"
              disabled={!spectatorToken}
            >
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </button>
            {menuOpen && (
              <div className={styles['menu-dropdown']}>
                <button
                  type="button"
                  className={styles['menu-item']}
                  onClick={() => {
                    setShareOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Share spectator link
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Status strip ── */}
      <div className={styles.status}>
        <span className={styles.statusEyebrow}>{myColorLabel}</span>
        <span className={styles.statusRule} />
        <span className={`${styles.statusTurn} ${isMyTurn ? styles.statusTurnActive : ''}`}>
          {turnText}
        </span>
        {actionMsg && <span className={styles.actionMsg}>{actionMsg}</span>}
      </div>

      {/* ── Board ── */}
      <div className={styles.boardArea}>
        <div className={styles['board-wrapper']}>
          <Chessboard
            options={{
              id: 'game-board',
              position: fen,
              onPieceDrop,
              boardOrientation: myColor ?? 'white',
              allowDragging: game.status === 'active' && isMyTurn && !gameOver,
            }}
          />

          {/* Waiting overlay */}
          {game.status === 'waiting' && !gameOver && (
            <div className={styles.boardOverlay}>
              <p className={styles.overlayEyebrow}>Awaiting opponent</p>
              <p className={styles.overlayHeadline}>The board is set.</p>
              <p className={styles.overlayLede}>
                Share the spectator link, or wait for someone to take the seat.
              </p>
              <div className={styles.overlayActions}>
                <button
                  className={styles.overlayPrimary}
                  onClick={() => setShareOpen(true)}
                  disabled={!spectatorToken}
                >
                  Share link
                </button>
                <button className={styles.overlaySecondary} onClick={handleCancelWaiting}>
                  Cancel game
                </button>
              </div>
            </div>
          )}

          {/* Game-over overlay */}
          {gameOver && (
            <div className={`${styles.boardOverlay} ${styles.boardOverlayDark}`}>
              <p className={styles.overlayEyebrow}>Match concluded</p>
              <p className={styles.overlayHeadline}>
                {gameOver.winner === 'draw' ? (
                  'Drawn'
                ) : (
                  <>
                    <span className={styles.overlayWinner}>{winnerName}</span>{' '}
                    <span className={styles.overlayWins}>wins</span>
                  </>
                )}
              </p>
              <p className={styles.overlayReason}>{REASON_COPY[gameOver.reason]}</p>
              <div className={styles.overlayActions}>
                <button
                  className={styles.overlayPrimary}
                  onClick={() => navigate('/lobby')}
                >
                  Back to lobby
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action rail */}
        {game.status === 'active' && !gameOver && myColor && (
          <div className={styles.actionRail}>
            <button
              className={styles.actionBtn}
              onClick={handleOfferDraw}
              disabled={drawPending}
            >
              {drawPending ? 'Draw offered…' : 'Offer draw'}
            </button>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={() => setConfirmResign(true)}
            >
              Resign
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Share modal (P5 markup preserved) */}
      {shareOpen && (
        <div className={styles['modal-backdrop']} onClick={() => setShareOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <p className={styles['modal-eyebrow']}>Spectator link</p>
              <button
                type="button"
                className={styles['modal-close']}
                onClick={() => setShareOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className={styles['modal-hint']}>
              Share this link with anyone who wants to watch the game.
            </p>
            <div className={styles['modal-row']}>
              <input
                className={styles['modal-input']}
                type="text"
                readOnly
                value={spectatorLink}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className={styles['modal-copy']}
                onClick={handleCopy}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resign confirm */}
      {confirmResign && (
        <div className={styles['modal-backdrop']} onClick={() => setConfirmResign(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <p className={styles['modal-eyebrow']}>Resign?</p>
              <button
                type="button"
                className={styles['modal-close']}
                onClick={() => setConfirmResign(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className={styles['modal-hint']}>
              Your opponent will be awarded the win.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalGhost} onClick={() => setConfirmResign(false)}>
                Cancel
              </button>
              <button className={styles.modalDanger} onClick={handleResign}>
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming draw offer */}
      {incomingDraw && !gameOver && (
        <div className={styles.drawToast} role="dialog">
          <p className={styles['modal-eyebrow']}>Draw offered</p>
          <p className={styles.drawToastBody}>
            {opponent?.username ?? 'Opponent'} offers a draw.
          </p>
          <div className={styles.modalActions}>
            <button className={styles.modalGhost} onClick={handleDeclineDraw}>
              Decline
            </button>
            <button className={styles.modalPrimary} onClick={handleAcceptDraw}>
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}