import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: 'student' | 'moderator' | 'admin';
  name: {
    first: string;
    last: string;
    patronymic?: string;
  };
  university: {
    id?: Types.ObjectId;
    name: string;
  };
  faculty: string;
  specialization: string;
  year: number;
  avatar?: string;
  bio?: string;
  socialLinks: {
    telegram?: string;
    vk?: string;
    github?: string;
  };
  skills: string[];
  interests: string[];
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      deadlines: boolean;
      materials: boolean;
      friends: boolean;
      forum: boolean;
    };
    privacy: {
      showEmail: boolean;
      showPhone: boolean;
      allowMessages: 'all' | 'friends' | 'none';
    };
  };
  stats: {
    materialsUploaded: number;
    reviewsWritten: number;
    questionsAsked: number;
    answersAccepted: number;
    reputation: number;
  };
  emailVerified: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'moderator', 'admin'],
      default: 'student',
    },
    name: {
      first: { type: String, required: true, trim: true },
      last: { type: String, required: true, trim: true },
      patronymic: { type: String, trim: true },
    },
    university: {
      id: { type: Schema.Types.ObjectId },
      name: { type: String, required: true },
    },
    faculty: { type: String, required: true },
    specialization: { type: String, required: true },
    year: { type: Number, required: true, min: 1, max: 6 },
    avatar: String,
    bio: { type: String, maxlength: 500 },
    socialLinks: {
      telegram: String,
      vk: String,
      github: String,
    },
    skills: [String],
    interests: [String],
    settings: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      notifications: {
        deadlines: { type: Boolean, default: true },
        materials: { type: Boolean, default: true },
        friends: { type: Boolean, default: true },
        forum: { type: Boolean, default: true },
      },
      privacy: {
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false },
        allowMessages: {
          type: String,
          enum: ['all', 'friends', 'none'],
          default: 'friends',
        },
      },
    },
    stats: {
      materialsUploaded: { type: Number, default: 0 },
      reviewsWritten: { type: Number, default: 0 },
      questionsAsked: { type: Number, default: 0 },
      answersAccepted: { type: Number, default: 0 },
      reputation: { type: Number, default: 0 },
    },
    emailVerified: { type: Boolean, default: false },
    lastActiveAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ 'university.id': 1, faculty: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ 'stats.reputation': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index(
  { 'name.first': 'text', 'name.last': 'text', email: 'text', faculty: 'text', specialization: 'text' },
  { name: 'user_search_text' }
);

export const UserModel = (mongoose.models.User as mongoose.Model<UserDocument>) || mongoose.model<UserDocument>('User', userSchema);
