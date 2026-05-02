import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import styles from './GamePage.module.css';

export default function GamePage() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [position, setPosition] = useState(chessGame.fen());

  // P3 will replace null with the spectatorToken from game data
  const spectatorToken: string | null = null;
  const spectatorLink = spectatorToken
    ? `${window.location.origin}/spectate/${spectatorToken}`
    : '';

  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    try {
      chessGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      setPosition(chessGame.fen());
      return true;
    } catch {
      return false;
    }
  }

  function handleCopy() {
    navigator.clipboard
      .writeText(spectatorLink)
      .then(() => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopied(true);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.menu} ref={menuRef}>
          <button
            type="button"
            className={styles['menu-trigger']}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Game options"
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
                onClick={() => { setShareOpen(true); setMenuOpen(false); }}
              >
                Share lobby
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles['board-wrapper']}>
        <Chessboard
          options={{
            id: 'game-board',
            position,
            onPieceDrop,
          }}
        />
      </div>

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
    </div>
  );
}
