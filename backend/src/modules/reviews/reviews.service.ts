import { Types } from 'mongoose';
import { ServiceError } from '../../utils/service-error.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { deleteCachePattern } from '../../utils/cache.js';
import { ReviewModel, type ReviewDocument } from './reviews.model.js';
import { UserModel } from '../users/users.model.js';
import { CourseModel } from '../courses/courses.model.js';
import { ProfessorModel } from '../professors/professors.model.js';
import { createNotification } from '../notifications/notifications.service.js';
import type { CreateReviewInput, ReviewQueryInput } from '@student-platform/shared';
import type { JwtPayload } from '../../plugins/auth.plugin.js';

interface ReviewsResult {
  reviews: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

const SORT_MAP: Record<string, Record<string, -1 | 1>> = {
  newest: { createdAt: -1 },
  helpful: { likes: -1 },
};

function sanitizeAnonymous(review: Record<string, unknown>): Record<string, unknown> {
  if (review.anonymous) {
    const author = review.author as Record<string, unknown>;
    return {
      ...review,
      author: { id: author.id, name: 'Анонимный студент' },
    };
  }
  return review;
}

export async function getReviews(query: ReviewQueryInput): Promise<ReviewsResult> {
  const { targetType, targetId, authorId, sort, page, limit } = query;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    status: 'active',
  };

  if (targetType && targetId) {
    filter['target.type'] = targetType;
    filter['target.id'] = new Types.ObjectId(targetId);
  }

  if (authorId) {
    filter['author.id'] = new Types.ObjectId(authorId);
  }

  const sortOrder = SORT_MAP[sort] ?? SORT_MAP.newest;

  const [docs, total] = await Promise.all([
    ReviewModel.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .select('-likedBy')
      .lean(),
    ReviewModel.countDocuments(filter),
  ]);

  const reviews = docs.map((doc) => sanitizeAnonymous(doc as unknown as Record<string, unknown>));

  return { reviews, total, page, limit };
}

export async function createReview(
  data: CreateReviewInput,
  user: JwtPayload & { name: string }
): Promise<ReviewDocument> {
  const authorId = new Types.ObjectId(user.id);
  const targetId = new Types.ObjectId(data.targetId);

  const existing = await ReviewModel.findOne({
    'author.id': authorId,
    'target.type': data.targetType,
    'target.id': targetId,
    semester: data.semester,
  }).lean();

  if (existing) {
    throw new ServiceError('Вы уже оставляли отзыв за этот семестр', 'DUPLICATE');
  }

  const review = await ReviewModel.create({
    target: { type: data.targetType, id: targetId, name: data.targetName },
    author: { id: authorId, name: user.name },
    anonymous: data.anonymous,
    ratings: data.ratings,
    text: data.text,
    semester: data.semester,
  });

  // Update target stats via aggregation
  await updateTargetStats(data.targetType, targetId);

  await UserModel.findByIdAndUpdate(user.id, {
    $inc: { 'stats.reviewsWritten': 1, 'stats.reputation': 3 },
  });

  trackActivity(
    'review_metrics',
    { action: 'create', targetType: data.targetType },
    { overall: data.ratings.overall, difficulty: data.ratings.difficulty, count: 1 }
  );

  await deleteCachePattern(`app:cache:reviews:${data.targetType}:${data.targetId}:*`);

  return review;
}

export async function toggleHelpful(
  reviewId: string,
  userId: string
): Promise<{ liked: boolean; likes: number }> {
  const uid = new Types.ObjectId(userId);

  // Atomic: try to pull first. If nothing was pulled, add instead.
  const pullResult = await ReviewModel.findOneAndUpdate(
    { _id: reviewId, likedBy: uid },
    { $pull: { likedBy: uid }, $inc: { likes: -1 } },
    { new: true }
  ).lean();

  if (pullResult) {
    return { liked: false, likes: pullResult.likes };
  }

  // User hadn't liked — add atomically
  const addResult = await ReviewModel.findByIdAndUpdate(
    reviewId,
    { $addToSet: { likedBy: uid }, $inc: { likes: 1 } },
    { new: true }
  ).lean();

  if (!addResult) throw new ServiceError('Отзыв не найден', 'NOT_FOUND');

  await UserModel.findByIdAndUpdate(addResult.author.id, {
    $inc: { 'stats.reputation': 1 },
  });

  // Notify the review author
  if (addResult.author.id.toString() !== userId) {
    await createNotification(
      addResult.author.id.toString(),
      'REVIEW_HELPFUL',
      'Ваш отзыв оценили',
      'Кто-то отметил ваш отзыв как полезный',
    );
  }

  return { liked: true, likes: addResult.likes };
}

export async function reportReview(
  reviewId: string,
  userId: string
): Promise<{ reports: number; hidden: boolean }> {
  const review = await ReviewModel.findById(reviewId).lean();

  if (!review) throw new ServiceError('Отзыв не найден', 'NOT_FOUND');

  const newReports = review.reports + 1;
  const shouldHide = newReports >= 5;

  await ReviewModel.findByIdAndUpdate(reviewId, {
    $inc: { reports: 1 },
    ...(shouldHide ? { $set: { status: 'hidden' } } : {}),
  });

  return { reports: newReports, hidden: shouldHide };
}

export async function getReviewById(id: string): Promise<Record<string, unknown> | null> {
  const review = await ReviewModel.findById(id).lean();
  if (!review) return null;
  return review as unknown as Record<string, unknown>;
}

export async function deleteReview(
  reviewId: string,
  userId: string,
  userRole: string
): Promise<{ deleted: boolean }> {
  const review = await ReviewModel.findById(reviewId).lean();
  if (!review) throw new ServiceError('Отзыв не найден', 'NOT_FOUND');

  const isAuthor = review.author.id.toString() === userId;
  const isModerator = userRole === 'moderator' || userRole === 'admin';

  if (!isAuthor && !isModerator) {
    throw new ServiceError('Недостаточно прав', 'FORBIDDEN');
  }

  await ReviewModel.deleteOne({ _id: reviewId });

  if (isAuthor) {
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { 'stats.reviewsWritten': -1, 'stats.reputation': -3 },
    });
  }

  await updateTargetStats(review.target.type, review.target.id);

  return { deleted: true };
}

async function updateTargetStats(
  targetType: string,
  targetId: Types.ObjectId
): Promise<void> {
  const pipeline = await ReviewModel.aggregate([
    { $match: { 'target.type': targetType, 'target.id': targetId, status: 'active' } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$ratings.overall' },
        avgDifficulty: { $avg: '$ratings.difficulty' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (pipeline.length === 0) return;

  const { avgRating, avgDifficulty, reviewCount } = pipeline[0];
  const stats = {
    'stats.avgRating': Math.round(avgRating * 10) / 10,
    'stats.avgDifficulty': Math.round(avgDifficulty * 10) / 10,
    'stats.reviewCount': reviewCount,
  };

  const ALLOWED_TARGETS = { course: CourseModel, professor: ProfessorModel } as const;
  const Model = ALLOWED_TARGETS[targetType as keyof typeof ALLOWED_TARGETS];

  if (Model) {
    await Model.findByIdAndUpdate(targetId, { $set: stats });
  }
}
