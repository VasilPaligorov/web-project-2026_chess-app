import mongoose, { Document, Schema } from 'mongoose';

export interface IBlacklistedToken extends Document {
  tokenHash: string;
  expiresAt: Date;
}

const blacklistedTokenSchema = new Schema<IBlacklistedToken>({
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const BlacklistedToken = mongoose.model<IBlacklistedToken>('BlacklistedToken', blacklistedTokenSchema);
