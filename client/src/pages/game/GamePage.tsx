import { Chessboard } from 'react-chessboard';
import styles from './GamePage.module.css';

export default function GamePage() {
  return (
    <div className={styles['board-wrapper']}>
      <Chessboard options={{ id: 'game-board' }} />
    </div>
  );
}
