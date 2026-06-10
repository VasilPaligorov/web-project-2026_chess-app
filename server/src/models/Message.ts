import mongoose, { Document, Schema } from 'mongoose';
import { MAX_CHAT_MESSAGE_LENGTH } from '../../../shared/types';

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
    text:     { type: String, required: true, maxlength: MAX_CHAT_MESSAGE_LENGTH },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
