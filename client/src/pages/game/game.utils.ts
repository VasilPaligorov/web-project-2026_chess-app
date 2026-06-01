import type { Game, GameOverPayload } from '../../../../shared/types';

export type Color = 'white' | 'black';

export const REASON_COPY: Record<GameOverPayload['reason'], string> = {
  checkmate: 'by checkmate',
  resignation: 'by resignation',
  stalemate: 'by stalemate',
  insufficient_material: 'by insufficient material',
  threefold_repetition: 'by threefold repetition',
  fifty_move_rule: 'by the fifty-move rule',
  agreement: 'by agreement',
  abandonment: 'by abandonment',
};

export function getMyColor(
  game: Game | null,
  userId: string | undefined,
): Color | null {
  if (!game || !userId) return null;
  if (game.whitePlayer._id === userId) return 'white';
  if (game.blackPlayer?._id === userId) return 'black';
  return null;
}

export function turnFromFen(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function winnerNameFor(
  game: Game,
  payload: GameOverPayload,
): string | null {
  if (payload.winner === 'draw') return null;
  if (payload.winner === 'white') return game.whitePlayer.username;
  return game.blackPlayer?.username ?? '—';
}
