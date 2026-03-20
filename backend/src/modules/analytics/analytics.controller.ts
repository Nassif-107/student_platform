import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getPersonalAnalytics,
  getCourseAnalytics,
  getPlatformAnalytics,
  getPopularCourses,
  getUserTimeline,
  getLeaderboard,
} from './analytics.service.js';
import { success, error } from '../../utils/api-response.js';

interface IdParams {
  id: string;
}

export async function getPersonalAnalyticsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;

  try {
    const data = await getPersonalAnalytics(user.id);
    return reply.send(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения аналитики';
    return reply.status(500).send(error('ANALYTICS_ERROR', message));
  }
}

export async function getCourseAnalyticsHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  try {
    const data = await getCourseAnalytics(request.params.id);
    return reply.send(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения аналитики курса';
    return reply.status(500).send(error('ANALYTICS_ERROR', message));
  }
}

export async function getPlatformAnalyticsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await getPlatformAnalytics();
    return reply.send(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения аналитики платформы';
    return reply.status(500).send(error('ANALYTICS_ERROR', message));
  }
}

// ---------- GET /analytics/courses/popular ----------

interface PopularCoursesQuery {
  limit?: number;
}

export async function getPopularCoursesHandler(
  request: FastifyRequest<{ Querystring: PopularCoursesQuery }>,
  reply: FastifyReply
) {
  try {
    const limit = request.query.limit ?? 10;
    const data = await getPopularCourses(limit);
    return reply.send(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения популярных курсов';
    return reply.status(500).send(error('ANALYTICS_ERROR', message));
  }
}

// ---------- GET /analytics/user/timeline ----------

export async function getUserTimelineHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await getUserTimeline(request.user.id);
    return reply.send(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения временной шкалы';
    return reply.status(500).send(error('ANALYTICS_ERROR', message));
  }
}

// ---------- GET /analytics/leaderboard ----------

interface LeaderboardQuery {
  limit?: number;
}

export async function getLeaderboardHandler(
  request: FastifyRequest<{ Querystring: LeaderboardQuery }>,
  reply: FastifyReply
) {
  try {
    const limit = request.query.limit ?? 20;
    const data = await getLeaderboard(limit);
    return reply.send(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения рейтинга';
    return reply.status(500).send(error('ANALYTICS_ERROR', message));
  }
}
