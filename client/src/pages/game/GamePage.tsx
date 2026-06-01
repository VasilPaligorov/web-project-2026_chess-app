import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useGame } from './useGame';
import { GameHeader } from './components/GameHeader';
import { WaitingOverlay } from './components/WaitingOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';
import { ShareModal } from './components/ShareModal';
import { ResignConfirmModal } from './components/ResignConfirmModal';
import { DrawOfferToast } from './components/DrawOfferToast';
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

  const [confirmResign, setConfirmResign] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  useEffect(() => setSelectedSquare(null), [fen]);

  const spectatorToken = game?.spectatorToken ?? null;
  const spectatorLink = spectatorToken
    ? `${window.location.origin}/spectate/${spectatorToken}`
    : '';

  const squareStyles = useMemo<Record<string, CSSProperties>>(() => {
    if (!selectedSquare || !isMyTurn) return {};
    let moves: Array<{ to: string; captured?: string }> = [];
    try {
      moves = new Chess(fen).moves({
        square: selectedSquare as Square,
        verbose: true,
      }) as typeof moves;
    } catch {
      return {};
    }
    if (moves.length === 0) return {};
    const dot =
      'radial-gradient(circle, rgba(122, 20, 24, 0.45) 22%, transparent 24%)';
    const ring =
      'radial-gradient(circle, transparent 56%, rgba(122, 20, 24, 0.55) 56%, rgba(122, 20, 24, 0.55) 64%, transparent 64%)';
    const out: Record<string, CSSProperties> = {
      [selectedSquare]: { background: 'rgba(122, 20, 24, 0.28)' },
    };
    for (const m of moves) {
      out[m.to] = { background: m.captured ? ring : dot };
    }
    return out;
  }, [selectedSquare, fen, isMyTurn]);

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;
      return tryMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    },
    [tryMove],
  );

  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      if (!myColor || game?.status !== 'active' || !isMyTurn) return;

      if (selectedSquare && selectedSquare !== square) {
        if (tryMove({ from: selectedSquare, to: square, promotion: 'q' })) return;
      }

      setSelectedSquare((prev) => (prev === square ? null : square));
    },
    [myColor, game?.status, isMyTurn, selectedSquare, tryMove],
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

      <div className={styles.status}>
        <span className={styles.statusEyebrow}>{myColorLabel}</span>
        <span className={styles.statusRule} />
        <span className={`${styles.statusTurn} ${isMyTurn ? styles.statusTurnActive : ''}`}>
          {turnText}
        </span>
        {actionMsg && <span className={styles.actionMsg}>{actionMsg}</span>}
      </div>

      <div className={styles.boardArea}>
        <div className={styles['board-wrapper']}>
          <Chessboard
            options={{
              id: 'game-board',
              position: fen,
              onPieceDrop,
              onSquareClick,
              squareStyles,
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

      {shareOpen && (
        <ShareModal link={spectatorLink} onClose={() => setShareOpen(false)} />
      )}

      {confirmResign && (
        <ResignConfirmModal
          onConfirm={handleConfirmResign}
          onCancel={() => setConfirmResign(false)}
        />
      )}

      {incomingDraw && !gameOver && (
        <DrawOfferToast
          opponentName={opponent?.username ?? 'Opponent'}
          onAccept={acceptDraw}
          onDecline={declineDraw}
        />
      )}
    </div>
  );
}
