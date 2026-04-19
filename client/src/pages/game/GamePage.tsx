import { useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import styles from './GamePage.module.css';

export default function GamePage() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [position, setPosition] = useState(chessGame.fen());

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;

    try {
      chessGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      setPosition(chessGame.fen());
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className={styles['board-wrapper']}>
      <Chessboard
        options={{
          id: 'game-board',
          position,
          onPieceDrop,
        }}
      />
    </div>
  );
}
