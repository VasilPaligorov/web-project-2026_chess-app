import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { Game } from '../../../../../shared/types';
import styles from './ReplayViewer.module.css';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface Props {
  game: Game;
  viewerColor: 'white' | 'black';
  onClose: () => void;
}

interface VerboseMove {
  san: string;
  from: string;
  to: string;
}

interface Replay {
  fens: string[];
  moves: VerboseMove[];
}

function buildReplay(pgn: string): Replay {
  const fens: string[] = [STARTING_FEN];
  const moves: VerboseMove[] = [];
  if (!pgn) return { fens, moves };
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return { fens, moves };
  }
  const history = chess.history({ verbose: true }) as VerboseMove[];
  const replay = new Chess();
  for (const m of history) {
    replay.move({ from: m.from, to: m.to });
    fens.push(replay.fen());
    moves.push({ san: m.san, from: m.from, to: m.to });
  }
  return { fens, moves };
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

  const movePairs = useMemo(() => {
    const pairs: { num: number; white?: VerboseMove; black?: VerboseMove }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({ num: i / 2 + 1, white: moves[i], black: moves[i + 1] });
    }
    return pairs;
  }, [moves]);

  const atStart = plyIndex === 0;
  const atEnd = plyIndex === lastPly;

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
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setPlyIndex(0)}
            disabled={atStart}
            aria-label="Jump to start"
          >
            ⏮
          </button>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setPlyIndex((i) => Math.max(0, i - 1))}
            disabled={atStart}
            aria-label="Previous move"
          >
            ◀
          </button>
          <span className={`${styles.plyLabel} tnum`}>
            {plyIndex} / {lastPly}
          </span>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setPlyIndex((i) => Math.min(lastPly, i + 1))}
            disabled={atEnd}
            aria-label="Next move"
          >
            ▶
          </button>
          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setPlyIndex(lastPly)}
            disabled={atEnd}
            aria-label="Jump to end"
          >
            ⏭
          </button>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close replay"
          >
            Close
          </button>
        </div>

        {moves.length === 0 ? (
          <p className={styles.empty}>No moves recorded for this game.</p>
        ) : (
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
                      onClick={() => setPlyIndex(whitePly)}
                    >
                      {white.san}
                    </button>
                  )}
                  {black && (
                    <button
                      type="button"
                      className={`${styles.moveBtn} ${plyIndex === blackPly ? styles.moveBtnActive : ''}`}
                      onClick={() => setPlyIndex(blackPly)}
                    >
                      {black.san}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
