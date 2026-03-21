import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ReviewDocument extends Document {
  _id: Types.ObjectId;
  target: {
    type: 'course' | 'professor';
    id: Types.ObjectId;
    name: string;
  };
  author: {
    id: Types.ObjectId;
    name: string;
  };
  anonymous: boolean;
  ratings: {
    overall: number;
    difficulty: number;
    usefulness: number;
    teachingQuality?: number;
    materialQuality?: number;
  };
  text: string;
  semester: string;
  likes: number;
  likedBy: Types.ObjectId[];
  reports: number;
  status: 'active' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    target: {
      type: { type: String, required: true, enum: ['course', 'professor'] },
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    },
    author: {
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    },
    anonymous: { type: Boolean, default: false },
    ratings: {
      overall: { type: Number, required: true, min: 1, max: 10 },
      difficulty: { type: Number, required: true, min: 1, max: 10 },
      usefulness: { type: Number, required: true, min: 1, max: 10 },
      teachingQuality: { type: Number, min: 1, max: 10 },
      materialQuality: { type: Number, min: 1, max: 10 },
    },
    text: { type: String, required: true, maxlength: 2000 },
    semester: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId }],
    reports: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true }
);

reviewSchema.index({ 'target.type': 1, 'target.id': 1, status: 1, createdAt: -1 });
reviewSchema.index(
  { 'author.id': 1, 'target.type': 1, 'target.id': 1, semester: 1 },
  { unique: true }
);
reviewSchema.index({ likes: -1 });

export const ReviewModel = (mongoose.models.Review as mongoose.Model<ReviewDocument>) || mongoose.model<ReviewDocument>('Review', reviewSchema);
