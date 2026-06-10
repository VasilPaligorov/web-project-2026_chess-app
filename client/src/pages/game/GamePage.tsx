import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChessScene from '../../components/ChessScene';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useGame } from './useGame';
import { GameHeader } from './components/GameHeader';
import { WaitingOverlay } from './components/WaitingOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';
import { ShareModal } from './components/ShareModal';
import { ResignConfirmModal } from './components/ResignConfirmModal';
import { DrawOfferToast } from './components/DrawOfferToast';
import { ChatPanel } from './components/ChatPanel';
import { useChat } from './useChat';
import styles from './GamePage.module.css';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { messages, sendMessage } = useChat(gameId);

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

  const spectatorToken = game?.spectatorToken ?? null;
  const spectatorLink = spectatorToken
    ? `${window.location.origin}/spectate/${spectatorToken}`
    : '';

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
      <GameHeader game={game} onShareClick={() => setShareOpen(true)} />

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
          <ChessScene
            fen={fen}
            myColor={myColor ?? 'white'}
            isMyTurn={game.status === 'active' && isMyTurn && !gameOver}
            onMove={(from, to) => tryMove({ from, to, promotion: 'q' })}
          />

          {game.status === 'waiting' && !gameOver && (
            <WaitingOverlay
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

        <div className={styles.sidebar}>
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

          {game.status !== 'waiting' && (
            <ChatPanel
              messages={messages}
              currentUserId={user._id}
              onSend={sendMessage}
            />
          )}
        </div>
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
