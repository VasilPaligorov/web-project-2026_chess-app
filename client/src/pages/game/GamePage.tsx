import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useGame } from './useGame';
import { GameHeader } from './components/GameHeader';
import { WaitingOverlay } from './components/WaitingOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';
import styles from './GamePage.module.css';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
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
  } = useGame(gameId);

  // UI-only state (modal gates — extracted in later commits)
  const [confirmResign, setConfirmResign] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spectatorToken = game?.spectatorToken ?? null;
  const spectatorLink = spectatorToken
    ? `${window.location.origin}/spectate/${spectatorToken}`
    : '';

  // Cleanup copy timeout on unmount
  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  // Handlers
  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;
      return tryMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    },
    [tryMove],
  );

  const handleConfirmResign = () => {
    resign();
    setConfirmResign(false);
  };

  const handleCancelWaiting = async () => {
    if (!gameId) return;
    try {
      await api.delete(`/api/games/${gameId}`);
      navigate('/lobby');
    } catch {
      announce('Could not cancel');
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

  return (
    <div className={styles.page}>
      <GameHeader
        game={game}
        spectatorEnabled={!!spectatorToken}
        onShareClick={() => setShareOpen(true)}
      />

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

          {game.status === 'waiting' && !gameOver && (
            <WaitingOverlay
              spectatorEnabled={!!spectatorToken}
              onShare={() => setShareOpen(true)}
              onCancel={handleCancelWaiting}
            />
          )}

          {gameOver && (
            <GameOverOverlay
              game={game}
              payload={gameOver}
              onBack={() => navigate('/lobby')}
            />
          )}
        </div>

        {/* Action rail */}
        {game.status === 'active' && !gameOver && myColor && (
          <div className={styles.actionRail}>
            <button
              className={styles.actionBtn}
              onClick={offerDraw}
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
              <button className={styles.modalDanger} onClick={handleConfirmResign}>
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
            <button className={styles.modalGhost} onClick={declineDraw}>
              Decline
            </button>
            <button className={styles.modalPrimary} onClick={acceptDraw}>
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}