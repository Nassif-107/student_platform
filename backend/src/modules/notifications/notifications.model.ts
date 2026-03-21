import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type NotificationType =
  | 'MATERIAL_NEW'
  | 'DEADLINE_REMINDER'
  | 'ANSWER_ACCEPTED'
  | 'NEW_ANSWER'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACTIVITY'
  | 'REVIEW_HELPFUL'
  | 'GROUP_INVITE'
  | 'EVENT_REMINDER';

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'MATERIAL_NEW',
        'DEADLINE_REMINDER',
        'ANSWER_ACCEPTED',
        'NEW_ANSWER',
        'FRIEND_REQUEST',
        'FRIEND_ACTIVITY',
        'REVIEW_HELPFUL',
        'GROUP_INVITE',
        'EVENT_REMINDER',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

export const NotificationModel = (mongoose.models.Notification as mongoose.Model<NotificationDocument>) || mongoose.model<NotificationDocument>('Notification', notificationSchema);
