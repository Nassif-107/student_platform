import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface CommentDocument extends Document {
  _id: Types.ObjectId;
  target: {
    type: 'material' | 'question';
    id: Types.ObjectId;
  };
  author: {
    id: Types.ObjectId;
    name: string;
    avatar?: string;
  };
  text: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    target: {
      type: { type: String, required: true, enum: ['material', 'question'] },
      id: { type: Schema.Types.ObjectId, required: true },
    },
    author: {
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      avatar: String,
    },
    text: { type: String, required: true, maxlength: 1000 },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ 'target.type': 1, 'target.id': 1, createdAt: -1 });

export const CommentModel = (mongoose.models.Comment as mongoose.Model<CommentDocument>) || mongoose.model<CommentDocument>('Comment', commentSchema
);
