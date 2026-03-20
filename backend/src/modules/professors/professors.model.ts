import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ProfessorDocument extends Document {
  _id: Types.ObjectId;
  name: {
    first: string;
    last: string;
    patronymic?: string;
  };
  university: {
    id?: Types.ObjectId;
    name?: string;
  };
  faculty?: string;
  department?: string;
  position?: string;
  email?: string;
  avatar?: string;
  stats: {
    avgRating: number;
    reviewCount: number;
    courseCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const professorSchema = new Schema<ProfessorDocument>(
  {
    name: {
      first: { type: String, required: true, trim: true },
      last: { type: String, required: true, trim: true },
      patronymic: { type: String, trim: true },
    },
    university: {
      id: { type: Schema.Types.ObjectId },
      name: String,
    },
    faculty: String,
    department: String,
    position: String,
    email: { type: String, lowercase: true, trim: true },
    avatar: String,
    stats: {
      avgRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      courseCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

professorSchema.index({ 'university.id': 1, faculty: 1 });
professorSchema.index({ 'stats.avgRating': -1 });
professorSchema.index(
  { 'name.first': 'text', 'name.last': 'text' },
  { weights: { 'name.last': 10, 'name.first': 5 } }
);

export const ProfessorModel = mongoose.model<ProfessorDocument>(
  'Professor',
  professorSchema
);
