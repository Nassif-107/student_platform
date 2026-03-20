import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { MATERIAL_TYPES } from '@student-platform/shared';

const materialTypeValues = Object.values(MATERIAL_TYPES);

export interface MaterialFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface MaterialDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  course: {
    id: Types.ObjectId;
    title: string;
    code: string;
  };
  type: string;
  description?: string;
  author: {
    id: Types.ObjectId;
    name: string;
    avatar?: string;
  };
  files: MaterialFile[];
  tags: string[];
  semester?: string;
  stats: {
    views: number;
    downloads: number;
    likes: number;
    commentCount: number;
  };
  likedBy: Types.ObjectId[];
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialFileSchema = new Schema<MaterialFile>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const materialSchema = new Schema<MaterialDocument>(
  {
    title: { type: String, required: true, trim: true },
    course: {
      id: { type: Schema.Types.ObjectId, required: true, index: true },
      title: { type: String, required: true },
      code: { type: String, required: true },
    },
    type: {
      type: String,
      required: true,
      enum: materialTypeValues,
    },
    description: { type: String, maxlength: 2000 },
    author: {
      id: { type: Schema.Types.ObjectId, required: true, index: true },
      name: { type: String, required: true },
      avatar: String,
    },
    files: [materialFileSchema],
    tags: [String],
    semester: String,
    stats: {
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
    },
    likedBy: [{ type: Schema.Types.ObjectId }],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

materialSchema.index({ 'course.id': 1, createdAt: -1 });
materialSchema.index({ 'author.id': 1, createdAt: -1 });
materialSchema.index({ type: 1, 'course.id': 1 });
materialSchema.index({ 'stats.downloads': -1 });
materialSchema.index({ 'stats.likes': -1 });
materialSchema.index({ 'stats.views': -1 });
materialSchema.index({ title: 'text', description: 'text', tags: 'text' });
materialSchema.index({ tags: 1 });

export const MaterialModel = mongoose.model<MaterialDocument>(
  'Material',
  materialSchema
);
