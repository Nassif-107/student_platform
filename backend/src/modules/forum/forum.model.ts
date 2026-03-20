import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface QuestionDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  body: string;
  course?: {
    id?: Types.ObjectId;
    title?: string;
  };
  author: {
    id: Types.ObjectId;
    name: string;
    avatar?: string;
  };
  tags: string[];
  views: number;
  votes: number;
  answerCount: number;
  hasAcceptedAnswer: boolean;
  status: 'open' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteEntry {
  userId: Types.ObjectId;
  value: 1 | -1;
}

export interface AnswerDocument extends Document {
  _id: Types.ObjectId;
  questionId: Types.ObjectId;
  author: {
    id: Types.ObjectId;
    name: string;
    avatar?: string;
  };
  body: string;
  votes: number;
  votedBy: VoteEntry[];
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<QuestionDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
    course: {
      id: { type: Schema.Types.ObjectId },
      title: String,
    },
    author: {
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      avatar: String,
    },
    tags: [String],
    views: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    answerCount: { type: Number, default: 0 },
    hasAcceptedAnswer: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  },
  { timestamps: true }
);

questionSchema.index({ 'course.id': 1, createdAt: -1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ status: 1, createdAt: -1 });
questionSchema.index(
  { title: 'text', body: 'text', tags: 'text' },
  { weights: { title: 10, body: 5, tags: 3 } }
);
questionSchema.index({ 'author.id': 1, createdAt: -1 });

const answerSchema = new Schema<AnswerDocument>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true, index: true },
    author: {
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      avatar: String,
    },
    body: { type: String, required: true, maxlength: 5000 },
    votes: { type: Number, default: 0 },
    votedBy: [
      {
        userId: Schema.Types.ObjectId,
        value: { type: Number, enum: [1, -1] },
      },
    ],
    isAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

answerSchema.index({ questionId: 1, votes: -1 });
answerSchema.index({ questionId: 1, isAccepted: 1 });

export const QuestionModel = mongoose.model<QuestionDocument>('Question', questionSchema);
export const AnswerModel = mongoose.model<AnswerDocument>('Answer', answerSchema);
