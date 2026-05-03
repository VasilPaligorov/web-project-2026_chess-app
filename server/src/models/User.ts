import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    elo:     { type: Number, default: 1200, index: true },
    peakElo: { type: Number, default: 1200 },
    wins:    { type: Number, default: 0 },
    losses:  { type: Number, default: 0 },
    draws:   { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = mongoose.model<IUser>('User', userSchema);
