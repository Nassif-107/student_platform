import mongoose from 'mongoose';
import { getInfluxQueryApi } from '../../config/influx.js';
import { env } from '../../config/env.js';
import { sanitizeIdForFlux } from '../../utils/validate-id.js';
import { logger } from '../../utils/logger.js';
import { MaterialModel } from '../materials/materials.model.js';
import { CourseModel } from '../courses/courses.model.js';
import { ReviewModel } from '../reviews/reviews.model.js';
import { QuestionModel } from '../forum/forum.model.js';
import { UserModel } from '../users/users.model.js';

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
// Personal analytics
// ---------------------------------------------------------------------------

export async function getPersonalAnalytics(userId: string) {
  const [activityByDay, materialsStats, reputationHistory, topMaterials] =
    await Promise.all([
      getActivityByDay(userId),
      getMaterialsStats(userId),
      getReputationHistory(userId),
      getTopMaterials(userId),
    ]);

  return { activityByDay, materialsStats, reputationHistory, topMaterials };
}

async function getActivityByDay(userId: string) {
  const safeId = sanitizeIdForFlux(userId);
  if (!safeId) return [];

  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "user_activity")
  |> filter(fn: (r) => r.userId == "${safeId}")
  |> aggregateWindow(every: 1d, fn: count, createEmpty: true)
  |> yield(name: "activity_by_day")`;

  return queryInflux(flux);
}

async function getMaterialsStats(userId: string) {
  const result = await MaterialModel.aggregate([
    { $match: { 'author.id': new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$stats.views' },
        totalDownloads: { $sum: '$stats.downloads' },
        totalLikes: { $sum: '$stats.likes' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] ?? { totalViews: 0, totalDownloads: 0, totalLikes: 0, count: 0 };
}

async function getReputationHistory(userId: string) {
  const safeId = sanitizeIdForFlux(userId);
  if (!safeId) return [];

  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -90d)
  |> filter(fn: (r) => r._measurement == "reputation_snapshot")
  |> filter(fn: (r) => r.userId == "${safeId}")
  |> aggregateWindow(every: 1w, fn: last, createEmpty: false)
  |> yield(name: "reputation_history")`;

  return queryInflux(flux);
}

async function getTopMaterials(userId: string) {
  return MaterialModel.find({ 'author.id': userId })
    .sort({ 'stats.downloads': -1 })
    .limit(5)
    .select('title type stats.downloads stats.views stats.likes')
    .lean();
}

// ---------------------------------------------------------------------------
// Course analytics
// ---------------------------------------------------------------------------

export async function getCourseAnalytics(courseId: string) {
  const [ratingTrend, difficultyTrend, materialsByType, activityHeatmap] =
    await Promise.all([
      getRatingTrend(courseId),
      getDifficultyTrend(courseId),
      getMaterialsByType(courseId),
      getActivityHeatmap(courseId),
    ]);

  return { ratingTrend, difficultyTrend, materialsByType, activityHeatmap };
}

async function getRatingTrend(courseId: string) {
  const safeId = sanitizeIdForFlux(courseId);
  if (!safeId) return [];

  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -365d)
  |> filter(fn: (r) => r._measurement == "review_metrics")
  |> filter(fn: (r) => r.courseId == "${safeId}")
  |> filter(fn: (r) => r._field == "rating")
  |> aggregateWindow(every: 1mo, fn: mean, createEmpty: false)
  |> yield(name: "rating_trend")`;

  return queryInflux(flux);
}

async function getDifficultyTrend(courseId: string) {
  const safeId = sanitizeIdForFlux(courseId);
  if (!safeId) return [];

  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -365d)
  |> filter(fn: (r) => r._measurement == "review_metrics")
  |> filter(fn: (r) => r.courseId == "${safeId}")
  |> filter(fn: (r) => r._field == "difficulty")
  |> aggregateWindow(every: 1mo, fn: mean, createEmpty: false)
  |> yield(name: "difficulty_trend")`;

  return queryInflux(flux);
}

async function getMaterialsByType(courseId: string) {
  return MaterialModel.aggregate([
    { $match: { 'course.id': new mongoose.Types.ObjectId(courseId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $project: { type: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } },
  ]);
}

async function getActivityHeatmap(courseId: string) {
  const safeId = sanitizeIdForFlux(courseId);
  if (!safeId) return [];

  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "user_activity")
  |> filter(fn: (r) => r.courseId == "${safeId}")
  |> map(fn: (r) => ({ r with hour: date.hour(t: r._time), dow: date.weekDay(t: r._time) }))
  |> group(columns: ["hour", "dow"])
  |> count()
  |> yield(name: "activity_heatmap")`;

  return queryInflux(flux);
}

// ---------------------------------------------------------------------------
// Platform analytics
// ---------------------------------------------------------------------------

export async function getPlatformAnalytics() {
  const [totalCounts, growthTrend, topUniversities, peakHours] =
    await Promise.all([
      getTotalCounts(),
      getGrowthTrend(),
      getTopUniversities(),
      getPeakHours(),
    ]);

  return { totalCounts, growthTrend, topUniversities, peakHours };
}

async function getTotalCounts() {
  const [users, materials, reviews, questions] = await Promise.all([
    UserModel.countDocuments(),
    MaterialModel.countDocuments(),
    ReviewModel.countDocuments(),
    QuestionModel.countDocuments(),
  ]);

  return { users, materials, reviews, questions };
}

async function getGrowthTrend() {
  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -90d)
  |> filter(fn: (r) => r._measurement == "platform_metrics")
  |> filter(fn: (r) => r._field == "new_users")
  |> aggregateWindow(every: 1w, fn: sum, createEmpty: true)
  |> yield(name: "growth_trend")`;

  return queryInflux(flux);
}

async function getTopUniversities() {
  return UserModel.aggregate([
    { $group: { _id: '$university.name', count: { $sum: 1 } } },
    { $project: { university: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
}

async function getPeakHours() {
  const flux = `from(bucket: "${BUCKET}")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "user_activity")
  |> map(fn: (r) => ({ r with hour: date.hour(t: r._time) }))
  |> group(columns: ["hour"])
  |> count()
  |> sort(columns: ["_value"], desc: true)
  |> yield(name: "peak_hours")`;

  return queryInflux(flux);
}

// ---------------------------------------------------------------------------
// Course popularity ranking
// ---------------------------------------------------------------------------

export async function getPopularCourses(limit = 10) {
  const [coursesByEnrollment, coursesByReviews, activityTrend] = await Promise.all([
    CourseModel.aggregate([
      { $project: { title: 1, code: 1, enrollmentCount: { $ifNull: ['$stats.enrolledCount', 0] } } },
      { $sort: { enrollmentCount: -1 } },
      { $limit: limit },
    ]),
    ReviewModel.aggregate([
      { $group: { _id: '$target.id', reviewCount: { $sum: 1 }, avgRating: { $avg: '$ratings.overall' } } },
      { $sort: { reviewCount: -1 } },
      { $limit: limit },
    ]),
    queryInflux(`from(bucket: "${BUCKET}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "user_activity")
      |> filter(fn: (r) => r.action == "material_view" or r.action == "review_created")
      |> group(columns: ["courseCode"])
      |> count()
      |> sort(columns: ["_value"], desc: true)
      |> limit(n: ${limit})
      |> yield(name: "popular_courses")`),
  ]);

  return { coursesByEnrollment, coursesByReviews, activityTrend };
}

// ---------------------------------------------------------------------------
// User activity timeline
// ---------------------------------------------------------------------------

export async function getUserTimeline(userId: string) {
  const safeId = sanitizeIdForFlux(userId);
  if (!safeId) return { activityTimeline: [], weeklyBreakdown: [] };

  const [activityTimeline, weeklyBreakdown] = await Promise.all([
    queryInflux(`from(bucket: "${BUCKET}")
      |> range(start: -90d)
      |> filter(fn: (r) => r._measurement == "user_activity")
      |> filter(fn: (r) => r.userId == "${safeId}")
      |> aggregateWindow(every: 1d, fn: count, createEmpty: true)
      |> yield(name: "activity_timeline")`),
    queryInflux(`from(bucket: "${BUCKET}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "user_activity")
      |> filter(fn: (r) => r.userId == "${safeId}")
      |> aggregateWindow(every: 1w, fn: count, createEmpty: true)
      |> yield(name: "weekly_breakdown")`),
  ]);

  return { activityTimeline, weeklyBreakdown };
}

// ---------------------------------------------------------------------------
// Reputation leaderboard
// ---------------------------------------------------------------------------

export async function getLeaderboard(limit = 20) {
  const leaderboard = await UserModel.aggregate([
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

  return leaderboard;
}
