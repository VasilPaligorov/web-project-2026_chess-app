import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  gameId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  text: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    gameId:   { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text:     { type: String, required: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
