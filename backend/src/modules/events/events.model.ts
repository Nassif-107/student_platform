import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { EVENT_TYPES, type EventType } from '@student-platform/shared';
import { EVENT_STATUSES, type EventStatus } from '@student-platform/shared';

const eventTypeValues = Object.values(EVENT_TYPES);
const eventStatusValues = Object.values(EVENT_STATUSES);

export interface EventDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  type: EventType;
  description: string;
  organizer?: {
    id?: Types.ObjectId;
    name?: string;
  };
  university?: {
    id?: Types.ObjectId;
    name?: string;
  };
  location?: string;
  date: Date;
  time?: string;
  maxParticipants?: number;
  attendeeCount: number;
  attendees: Types.ObjectId[];
  tags: string[];
  coverPhoto?: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventDocument>(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: eventTypeValues,
    },
    description: { type: String, required: true, maxlength: 5000 },
    organizer: {
      id: { type: Schema.Types.ObjectId },
      name: String,
    },
    university: {
      id: { type: Schema.Types.ObjectId },
      name: String,
    },
    location: String,
    date: { type: Date, required: true },
    time: String,
    maxParticipants: { type: Number, min: 1 },
    attendeeCount: { type: Number, default: 0 },
    attendees: [{ type: Schema.Types.ObjectId }],
    tags: [String],
    coverPhoto: String,
    status: {
      type: String,
      enum: eventStatusValues,
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

eventSchema.index({ 'university.id': 1, date: 1, status: 1 });
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ type: 1, date: 1 });

export const EventModel = mongoose.model<EventDocument>('Event', eventSchema);
