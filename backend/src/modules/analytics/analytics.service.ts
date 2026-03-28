/**
 * Analytics service — hybrid queries across MongoDB, InfluxDB, and Redis.
 *
 * Design principles:
 *  - MongoDB = source of truth for counts, stats, aggregations
 *  - InfluxDB = time-series data for charts, trends, activity over time
 *  - Redis = leaderboard sorted sets (handled by seed/sync jobs)
 *  - Frontend receives flat, ready-to-display structures (no InfluxDB knowledge needed)
 */
import mongoose from 'mongoose';
import { getInfluxQueryApi } from '../../config/influx.js';
import { env } from '../../config/env.js';
import { sanitizeIdForFlux } from '../../utils/validate-id.js';
import { logger } from '../../utils/logger.js';
import { MaterialModel } from '../materials/materials.model.js';
import { CourseModel } from '../courses/courses.model.js';
import { ReviewModel } from '../reviews/reviews.model.js';
import { QuestionModel, AnswerModel } from '../forum/forum.model.js';
import { UserModel } from '../users/users.model.js';
import { EventModel } from '../events/events.model.js';
import { GroupModel } from '../groups/groups.model.js';

const BUCKET = env.INFLUX_BUCKET;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function queryInflux<T = Record<string, unknown>>(flux: string): Promise<T[]> {
  const queryApi = getInfluxQueryApi();
  try {
    const rows = await queryApi.collectRows<T>(flux);
    return rows;
  } catch (err) {
    logger.error(err, '[Analytics] InfluxDB query error');
    return [];
  }
}

// ---------------------------------------------------------------------------
// Personal analytics — MongoDB for stats, InfluxDB for timeline
// ---------------------------------------------------------------------------

export async function getPersonalAnalytics(userId: string) {
  const oid = new mongoose.Types.ObjectId(userId);

  // All stats from MongoDB — the source of truth
  const [user, materialsStats, reviewCount, questionCount, answerCount, groupCount, eventCount, topMaterials, activityByDay] =
    await Promise.all([
      UserModel.findById(userId).select('stats').lean(),
      MaterialModel.aggregate([
        { $match: { 'author.id': oid } },
        { $group: { _id: null, count: { $sum: 1 }, totalViews: { $sum: '$stats.views' }, totalDownloads: { $sum: '$stats.downloads' }, totalLikes: { $sum: '$stats.likes' } } },
      ]).then((r) => r[0] ?? { count: 0, totalViews: 0, totalDownloads: 0, totalLikes: 0 }),
      ReviewModel.countDocuments({ 'author.id': oid }),
      QuestionModel.countDocuments({ 'author.id': oid }),
      AnswerModel.countDocuments({ 'author.id': oid }),
      GroupModel.countDocuments({ 'members.userId': oid }),
      EventModel.countDocuments({ attendees: oid }),
      MaterialModel.find({ 'author.id': oid }).sort({ 'stats.downloads': -1 }).limit(5).select('title type stats').lean(),
      getActivityTimeline(userId),
    ]);

  return {
    // Flat stats for the frontend StatCards
    materialsUploaded: materialsStats.count,
    reviewsWritten: reviewCount,
    questionsAsked: questionCount,
    answersGiven: answerCount,
    groupsJoined: groupCount,
    eventsAttended: eventCount,
    reputation: user?.stats?.reputation ?? 0,
    loginStreak: 0, // not tracked currently
    // Detailed data for charts
    materialsStats,
    topMaterials,
    activityByDay,
  };
}

async function getActivityTimeline(userId: string) {
  const safeId = sanitizeIdForFlux(userId);
  if (!safeId) return [];

  // InfluxDB stores userId as a stringField — filter using _value comparison via pivot
  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "user_activity")
  |> filter(fn: (r) => r._field == "userId")
  |> filter(fn: (r) => r._value == "${safeId}")
  |> aggregateWindow(every: 1d, fn: count, createEmpty: true)
  |> yield(name: "activity_timeline")`;

  return queryInflux(flux);
}

// ---------------------------------------------------------------------------
// Course analytics — MongoDB for ratings, InfluxDB for activity trends
// ---------------------------------------------------------------------------

export async function getCourseAnalytics(courseId: string) {
  const oid = new mongoose.Types.ObjectId(courseId);

  // Rating and difficulty trends from MongoDB reviews (grouped by semester)
  const [ratingsBySemester, materialsByType, enrolledCount] = await Promise.all([
    ReviewModel.aggregate([
      { $match: { 'target.type': 'course', 'target.id': oid } },
      {
        $group: {
          _id: '$semester',
          avgRating: { $avg: '$ratings.overall' },
          avgDifficulty: { $avg: '$ratings.difficulty' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    MaterialModel.aggregate([
      { $match: { 'course.id': oid } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]),
    CourseModel.findById(courseId).select('stats.enrolledCount').lean(),
  ]);

  return {
    ratingTrend: ratingsBySemester.map((r) => ({ semester: r._id, avgRating: r.avgRating, count: r.count })),
    difficultyTrend: ratingsBySemester.map((r) => ({ semester: r._id, avgDifficulty: r.avgDifficulty })),
    materialsByType,
    enrolledCount: (enrolledCount as any)?.stats?.enrolledCount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Platform analytics (admin) — all MongoDB counts
// ---------------------------------------------------------------------------

export async function getPlatformAnalytics() {
  const [users, materials, reviews, questions, courses, groups, events, topUniversities] =
    await Promise.all([
      UserModel.countDocuments(),
      MaterialModel.countDocuments(),
      ReviewModel.countDocuments(),
      QuestionModel.countDocuments(),
      CourseModel.countDocuments(),
      GroupModel.countDocuments(),
      EventModel.countDocuments(),
      UserModel.aggregate([
        { $group: { _id: '$university.name', count: { $sum: 1 } } },
        { $project: { university: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

  return {
    totalCounts: { users, materials, reviews, questions, courses, groups, events },
    topUniversities,
  };
}

// ---------------------------------------------------------------------------
// Course popularity ranking — MongoDB
// ---------------------------------------------------------------------------

export async function getPopularCourses(limit = 10) {
  const [coursesByEnrollment, coursesByReviews, materialsByCourse] = await Promise.all([
    CourseModel.aggregate([
      {
        $project: {
          title: 1,
          code: 1,
          enrollmentCount: { $ifNull: ['$stats.enrolledCount', 0] },
          materialCount: { $ifNull: ['$stats.materialCount', 0] },
        },
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: limit },
    ]),
    ReviewModel.aggregate([
      { $group: { _id: '$target.id', reviewCount: { $sum: 1 }, avgRating: { $avg: '$ratings.overall' } } },
      { $sort: { reviewCount: -1 } },
      { $limit: limit },
    ]),
    // Actual material count from Materials collection (more accurate than stats cache)
    MaterialModel.aggregate([
      { $group: { _id: '$course.id', count: { $sum: 1 } } },
    ]),
  ]);

  // Merge real materialCount into course data
  const matMap = new Map(materialsByCourse.map((m) => [String(m._id), m.count]));
  for (const c of coursesByEnrollment) {
    c.materialCount = matMap.get(String(c._id)) ?? c.materialCount ?? 0;
  }

  return { coursesByEnrollment, coursesByReviews };
}

// ---------------------------------------------------------------------------
// User activity timeline — InfluxDB
// ---------------------------------------------------------------------------

export async function getUserTimeline(userId: string) {
  const safeId = sanitizeIdForFlux(userId);
  if (!safeId) return { activityTimeline: [], weeklyBreakdown: [] };

  // userId is stored as stringField — filter by field value, not tag
  const [activityTimeline, weeklyBreakdown] = await Promise.all([
    queryInflux(`from(bucket: "${BUCKET}")
      |> range(start: -90d)
      |> filter(fn: (r) => r._measurement == "user_activity")
      |> filter(fn: (r) => r._field == "userId")
      |> filter(fn: (r) => r._value == "${safeId}")
      |> aggregateWindow(every: 1d, fn: count, createEmpty: true)
      |> yield(name: "activity_timeline")`),
    queryInflux(`from(bucket: "${BUCKET}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "user_activity")
      |> filter(fn: (r) => r._field == "userId")
      |> filter(fn: (r) => r._value == "${safeId}")
      |> aggregateWindow(every: 1w, fn: count, createEmpty: true)
      |> yield(name: "weekly_breakdown")`),
  ]);

  return { activityTimeline, weeklyBreakdown };
}

// ---------------------------------------------------------------------------
// Reputation leaderboard — MongoDB
// ---------------------------------------------------------------------------

export async function getLeaderboard(limit = 20) {
  return UserModel.aggregate([
    { $match: { 'stats.reputation': { $gt: 0 } } },
    {
      $project: {
        name: 1,
        avatar: 1,
        'university.name': 1,
        reputation: { $ifNull: ['$stats.reputation', 0] },
        materialsCount: { $ifNull: ['$stats.materialsUploaded', 0] },
        reviewsCount: { $ifNull: ['$stats.reviewsWritten', 0] },
      },
    },
    { $sort: { reputation: -1 } },
    { $limit: limit },
  ]);
}
