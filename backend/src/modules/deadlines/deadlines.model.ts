import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { DEADLINE_TYPES } from '@student-platform/shared';

const deadlineTypeValues = Object.values(DEADLINE_TYPES);

export interface DeadlineDocument extends Document {
  _id: Types.ObjectId;
  course: {
    id: Types.ObjectId;
    title: string;
    code: string;
  };
  title: string;
  type: 'лабораторная' | 'курсовая' | 'экзамен' | 'зачёт' | 'домашнее задание' | 'другое';
  description?: string;
  dueDate: Date;
  createdBy: {
    id: Types.ObjectId;
    name: string;
  };
  confirmations: number;
  confirmedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const deadlineSchema = new Schema<DeadlineDocument>(
  {
    course: {
      id: { type: Schema.Types.ObjectId, required: true },
      title: { type: String, required: true },
      code: { type: String, required: true },
    },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: deadlineTypeValues,
    },
    description: String,
    dueDate: { type: Date, required: true },
    createdBy: {
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    },
    confirmations: { type: Number, default: 1 },
    confirmedBy: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

deadlineSchema.index({ 'course.id': 1, dueDate: 1 });
deadlineSchema.index({ dueDate: 1 });

export const DeadlineModel = mongoose.model<DeadlineDocument>('Deadline', deadlineSchema);
