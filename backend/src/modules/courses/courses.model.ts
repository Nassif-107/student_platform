import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { COURSE_TYPES } from '@student-platform/shared';

const courseTypeValues = Object.values(COURSE_TYPES);

export interface ScheduleEntry {
  day: string;
  time: string;
  room: string;
  type: string;
}

export interface CourseDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  code: string;
  description: string;
  university: {
    id?: Types.ObjectId;
    name: string;
  };
  faculty: string;
  year: number;
  semester: number;
  type: string;
  credits: number;
  professor: {
    id?: Types.ObjectId;
    name: string;
  };
  schedule: ScheduleEntry[];
  tags: string[];
  stats: {
    avgRating: number;
    reviewCount: number;
    avgDifficulty: number;
    materialCount: number;
    enrolledCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const scheduleEntrySchema = new Schema<ScheduleEntry>(
  {
    day: {
      type: String,
      enum: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    },
    time: String,
    room: String,
    type: {
      type: String,
      enum: ['Лекция', 'Практика', 'Лабораторная'],
    },
  },
  { _id: false }
);

const courseSchema = new Schema<CourseDocument>(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true },
    university: {
      id: { type: Schema.Types.ObjectId },
      name: { type: String, required: true },
    },
    faculty: { type: String, required: true },
    year: { type: Number, required: true, min: 1, max: 6 },
    semester: { type: Number, required: true, enum: [1, 2] },
    type: {
      type: String,
      required: true,
      enum: courseTypeValues,
    },
    credits: { type: Number, required: true, min: 1 },
    professor: {
      id: { type: Schema.Types.ObjectId, ref: 'Professor' },
      name: { type: String, required: true },
    },
    schedule: [scheduleEntrySchema],
    tags: [String],
    stats: {
      avgRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      avgDifficulty: { type: Number, default: 0 },
      materialCount: { type: Number, default: 0 },
      enrolledCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

courseSchema.index({ 'university.id': 1, faculty: 1, year: 1 });
courseSchema.index({ code: 1, 'university.id': 1 }, { unique: true });
courseSchema.index({ tags: 1 });
courseSchema.index({ 'stats.avgRating': -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 1 });
courseSchema.index(
  { title: 'text', code: 'text', tags: 'text' },
  { weights: { title: 10, code: 5, tags: 3 } }
);

export const CourseModel = (mongoose.models.Course as mongoose.Model<CourseDocument>) || mongoose.model<CourseDocument>('Course', courseSchema);
