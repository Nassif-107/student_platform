import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ChatMessageDocument extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  text: string;
  createdAt: Date;
}

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    groupId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// Compound index for fetching recent messages per group
chatMessageSchema.index({ groupId: 1, createdAt: -1 });

// TTL: auto-delete messages older than 90 days
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const ChatMessageModel =
  (mongoose.models.ChatMessage as mongoose.Model<ChatMessageDocument>) ||
  mongoose.model<ChatMessageDocument>('ChatMessage', chatMessageSchema);
