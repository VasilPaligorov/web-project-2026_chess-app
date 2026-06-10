import type { VerboseMove } from '../profile.utils';
import styles from './MoveList.module.css';

export interface MovePair {
  num: number;
  white?: VerboseMove;
  black?: VerboseMove;
}

interface Props {
  movePairs: MovePair[];
  plyIndex: number;
  onSelectPly: (ply: number) => void;
}

export function MoveList({ movePairs, plyIndex, onSelectPly }: Props) {
  if (movePairs.length === 0) {
    return <p className={styles.empty}>No moves recorded for this game.</p>;
  }

  return (
    <ol className={styles.moveList} aria-label="Move list">
      {movePairs.map(({ num, white, black }) => {
        const whitePly = (num - 1) * 2 + 1;
        const blackPly = (num - 1) * 2 + 2;
        return (
          <li key={num} className={styles.moveRow}>
            <span className={`${styles.moveNum} tnum`}>{num}.</span>
            {white && (
              <button
                type="button"
                className={`${styles.moveBtn} ${plyIndex === whitePly ? styles.moveBtnActive : ''}`}
                onClick={() => onSelectPly(whitePly)}
              >
                {white.san}
              </button>
            )}
            {black && (
              <button
                type="button"
                className={`${styles.moveBtn} ${plyIndex === blackPly ? styles.moveBtnActive : ''}`}
                onClick={() => onSelectPly(blackPly)}
              >
                {black.san}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
