import { api } from './api'
import { buildQueryString } from '@/lib/query'

export interface PlatformStats {
  totalUsers: number
  totalCourses: number
  totalMaterials: number
  totalQuestions: number
  totalReviews: number
  totalGroups: number
  activeUsersToday: number
  newUsersThisWeek: number
}

export interface UserActivityStats {
  materialsUploaded: number
  questionsAsked: number
  answersGiven: number
  reviewsWritten: number
  groupsJoined: number
  eventsAttended: number
  reputation: number
  loginStreak: number
}

export interface CoursePopularity {
  courseId: string
  courseName: string
  enrolledCount: number
  reviewCount: number
  averageRating: number
  materialCount: number
}

export interface ActivityTimeline {
  date: string
  actions: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapUserActivityStats(raw: any): UserActivityStats {
  // Backend /analytics/personal returns { activityByDay, materialsStats, reputationHistory, topMaterials }
  // Extract what we can from the nested InfluxDB data or use defaults
  return {
    materialsUploaded: raw.materialsUploaded ?? raw.materialsStats?.length ?? 0,
    questionsAsked: raw.questionsAsked ?? 0,
    answersGiven: raw.answersGiven ?? 0,
    reviewsWritten: raw.reviewsWritten ?? 0,
    groupsJoined: raw.groupsJoined ?? 0,
    eventsAttended: raw.eventsAttended ?? 0,
    reputation: raw.reputation ?? 0,
    loginStreak: raw.loginStreak ?? 0,
  }
}

function mapCoursePopularity(raw: any): CoursePopularity[] {
  // Backend returns { coursesByEnrollment, coursesByReviews, activityTrend }
  const enrollmentArr = raw?.coursesByEnrollment ?? (Array.isArray(raw) ? raw : [])
  const reviewsArr = raw?.coursesByReviews ?? []

  return enrollmentArr.map((c: any) => {
    const reviewInfo = reviewsArr.find((r: any) => String(r._id) === String(c._id))
    return {
      courseId: String(c._id ?? c.id ?? ''),
      courseName: c.title ?? c.courseName ?? '',
      enrolledCount: c.enrollmentCount ?? c.enrolledCount ?? 0,
      reviewCount: reviewInfo?.reviewCount ?? c.reviewCount ?? 0,
      averageRating: reviewInfo?.avgRating ?? c.averageRating ?? 0,
      materialCount: c.materialCount ?? 0,
    }
  })
}

function mapActivityTimeline(raw: any): ActivityTimeline[] {
  // Backend returns { activityTimeline, weeklyBreakdown }
  // activityTimeline items are InfluxDB rows: { _time, _value, ... }
  const arr = raw?.activityTimeline ?? (Array.isArray(raw) ? raw : [])
  return arr.map((row: any) => ({
    date: row._time ?? row.date ?? '',
    actions: row._value ?? row.actions ?? row.count ?? 0,
  }))
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const analyticsService = {
  getPlatformStats: () =>
    api.get<PlatformStats>('/analytics/platform'),

  getUserActivityStats: async (): Promise<UserActivityStats> => {
    const raw = await api.get<any>('/analytics/personal')
    return mapUserActivityStats(raw)
  },

  getCoursePopularity: async (limit?: number): Promise<CoursePopularity[]> => {
    const raw = await api.get<any>(
      `/analytics/courses/popular${buildQueryString({ limit })}`,
    )
    return mapCoursePopularity(raw)
  },

  getActivityTimeline: async (days?: number): Promise<ActivityTimeline[]> => {
    const raw = await api.get<any>(
      `/analytics/user/timeline${buildQueryString({ days })}`,
    )
    return mapActivityTimeline(raw)
  },

  getLeaderboard: (period?: 'week' | 'month' | 'all') =>
    api.get<
      Array<{
        userId: string
        userName: string
        avatarUrl?: string
        reputation: number
        rank: number
      }>
    >(`/analytics/leaderboard${buildQueryString({ period })}`),

  getCourseAnalytics: (courseId: string) =>
    api.get<{
      ratingTrend?: Array<{ semester: string; avgRating: number }>
      difficultyTrend?: Array<{ semester: string; avgDifficulty: number }>
      materialActivity?: Array<{ date: string; count: number }>
    }>(`/analytics/course/${courseId}`),
}
