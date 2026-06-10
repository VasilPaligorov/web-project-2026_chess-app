import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Game } from '../../../../../shared/types';
import { buildReplay } from '../profile.utils';
import { ReplayControls } from './ReplayControls';
import { MoveList, type MovePair } from './MoveList';
import styles from './ReplayViewer.module.css';

interface Props {
  game: Game;
  viewerColor: 'white' | 'black';
  onClose: () => void;
}

export function ReplayViewer({ game, viewerColor, onClose }: Props) {
  const { fens, moves } = useMemo(() => buildReplay(game.pgn), [game.pgn]);
  const lastPly = fens.length - 1;
  const [plyIndex, setPlyIndex] = useState<number>(lastPly);

  useEffect(() => {
    setPlyIndex(lastPly);
  }, [game._id, lastPly]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlyIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlyIndex((i) => Math.min(lastPly, i + 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setPlyIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setPlyIndex(lastPly);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lastPly]);

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    if (plyIndex === 0) return {};
    const m = moves[plyIndex - 1];
    if (!m) return {};
    const tint = { background: 'rgba(122, 20, 24, 0.22)' };
    return { [m.from]: tint, [m.to]: tint };
  }, [moves, plyIndex]);

  const movePairs = useMemo<MovePair[]>(() => {
    const pairs: MovePair[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({ num: i / 2 + 1, white: moves[i], black: moves[i + 1] });
    }
    return pairs;
  }, [moves]);

  return (
    <section className={styles.viewer} aria-label="Game replay">
      <div className={styles.boardWrap}>
        <Chessboard
          options={{
            id: `replay-${game._id}`,
            position: fens[plyIndex],
            boardOrientation: viewerColor,
            allowDragging: false,
            squareStyles,
          }}
        />
      </div>

      <div className={styles.panel}>
        <ReplayControls
          plyIndex={plyIndex}
          lastPly={lastPly}
          onJumpToStart={() => setPlyIndex(0)}
          onPrev={() => setPlyIndex((i) => Math.max(0, i - 1))}
          onNext={() => setPlyIndex((i) => Math.min(lastPly, i + 1))}
          onJumpToEnd={() => setPlyIndex(lastPly)}
          onClose={onClose}
        />
        <MoveList movePairs={movePairs} plyIndex={plyIndex} onSelectPly={setPlyIndex} />
      </div>
    </section>
  );
}
