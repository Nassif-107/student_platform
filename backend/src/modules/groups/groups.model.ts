import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface GroupMember {
  userId: Types.ObjectId;
  name: string;
  role: 'leader' | 'member';
  joinedAt: Date;
}

export interface GroupDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  course: {
    id: Types.ObjectId;
    title: string;
  };
  type: 'study' | 'project' | 'exam_prep';
  description?: string;
  members: GroupMember[];
  maxMembers: number;
  status: 'open' | 'full' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<GroupDocument>(
  {
    name: { type: String, required: true, trim: true },
    course: {
      id: { type: Schema.Types.ObjectId, required: true },
      title: { type: String, required: true },
    },
    type: {
      type: String,
      required: true,
      enum: ['study', 'project', 'exam_prep'],
    },
    description: { type: String, maxlength: 500 },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        role: { type: String, enum: ['leader', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    maxMembers: { type: Number, default: 5, min: 2, max: 10 },
    status: { type: String, enum: ['open', 'full', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

groupSchema.index({ 'course.id': 1, status: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ type: 1 });
groupSchema.index({ createdAt: -1 });

export const GroupModel = mongoose.model<GroupDocument>('Group', groupSchema);
