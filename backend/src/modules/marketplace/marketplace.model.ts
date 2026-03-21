import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { LISTING_TYPES, CONDITION_TYPES, type ListingType, type ConditionType } from '@student-platform/shared';

const listingTypeValues = Object.values(LISTING_TYPES);
const conditionTypeValues = Object.values(CONDITION_TYPES);

export type { ListingType, ConditionType as ListingCondition };
export type ListingStatus = 'active' | 'reserved' | 'sold' | 'closed';

export interface ListingDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  type: ListingType;
  price?: number;
  condition?: ListingCondition;
  photos: string[];
  description?: string;
  course?: {
    id?: Types.ObjectId;
    title?: string;
  };
  seller: {
    id: Types.ObjectId;
    name: string;
    university?: string;
  };
  location?: string;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<ListingDocument>(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: listingTypeValues,
    },
    price: { type: Number, min: 0 },
    condition: {
      type: String,
      enum: conditionTypeValues,
    },
    photos: [String],
    description: { type: String, maxlength: 1000 },
    course: {
      id: { type: Schema.Types.ObjectId },
      title: String,
    },
    seller: {
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      university: String,
    },
    location: String,
    status: {
      type: String,
      enum: ['active', 'reserved', 'sold', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

listingSchema.index({ 'seller.university': 1, status: 1, createdAt: -1 });
listingSchema.index({ 'course.id': 1, status: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ type: 1, status: 1 });
listingSchema.index({ price: 1 });
listingSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 5 } }
);

export const ListingModel = (mongoose.models.Listing as mongoose.Model<ListingDocument>) || mongoose.model<ListingDocument>('Listing', listingSchema);
