import mongoose, { Document, Schema, Types } from 'mongoose';
import { randomUUID } from 'crypto';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type EndReason =
  | 'checkmate'
  | 'resignation'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'agreement'
  | 'abandonment';

export interface IGame extends Document {
  whitePlayer: Types.ObjectId;
  blackPlayer: Types.ObjectId | null;
  status: 'waiting' | 'active' | 'finished';
  result: 'white' | 'black' | 'draw' | null;
  winner: Types.ObjectId | null;
  fen: string;
  pgn: string;
  spectatorToken: string;
  drawOffer: { from: Types.ObjectId } | null;
  createdAt: Date;
  finishedAt: Date | null;
  endReason: EndReason | null;
}

const gameSchema = new Schema<IGame>(
  {
    whitePlayer:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blackPlayer:    { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status:         { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting', index: true },
    result:         { type: String, enum: ['white', 'black', 'draw', null], default: null },
    winner:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
    fen:            { type: String, default: STARTING_FEN },
    pgn:            { type: String, default: '' },
    spectatorToken: { type: String, required: true, unique: true, default: () => randomUUID() },
    drawOffer:      { type: { from: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, default: null },
    finishedAt:  { type: Date, default: null },
    endReason:   {
      type: String,
      enum: [
        'checkmate', 'resignation', 'stalemate',
        'insufficient_material', 'threefold_repetition',
        'fifty_move_rule', 'agreement', 'abandonment',
        null,
      ],
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Game = mongoose.model<IGame>('Game', gameSchema);
