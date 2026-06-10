import { Chess } from 'chess.js';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface VerboseMove {
  san: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface Replay {
  fens: string[];
  moves: VerboseMove[];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

export function pct(wins: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((wins / total) * 100)}%`;
}

export function buildReplay(pgn: string): Replay {
  const fens: string[] = [STARTING_FEN];
  const moves: VerboseMove[] = [];
  if (!pgn) return { fens, moves };
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true }) as VerboseMove[];
    const replay = new Chess();
    for (const m of history) {
      replay.move({ from: m.from, to: m.to, promotion: m.promotion });
      fens.push(replay.fen());
      moves.push({ san: m.san, from: m.from, to: m.to });
    }
  } catch {}
  return { fens, moves };
}
