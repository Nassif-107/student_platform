import { type FilterQuery } from 'mongoose';
import { CourseModel, type CourseDocument } from './courses.model.js';
import { ServiceError } from '../../utils/service-error.js';
import {
  createCourseNode,
  linkProfessorToCourse,
  enrollStudent,
  getPrerequisiteChain,
  getCourseRecommendations,
  getCourseStudents,
} from './courses.graph.js';
import { getCache, setCache, deleteCache, buildCacheKey } from '../../utils/cache.js';
import { trackActivity } from '../../utils/influx-writer.js';

interface CourseQuery {
  universityId?: string;
  faculty?: string;
  year?: number;
  semester?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateCourseData {
  title: string;
  code: string;
  description: string;
  university: { id?: string; name: string };
  faculty: string;
  year: number;
  semester: number;
  type: string;
  credits: number;
  professor: { id?: string; name: string };
  schedule?: Array<{ day: string; time: string; room: string; type: string }>;
  tags?: string[];
}

const CACHE_PREFIX = 'app:cache:course';
const CACHE_TTL = 600; // 10 minutes

function buildSortOption(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case '-rating':
      return { 'stats.avgRating': -1 };
    case 'title':
      return { title: 1 };
    case '-createdAt':
    default:
      return { createdAt: -1 };
  }
}

export async function getCourses(query: CourseQuery) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  const cacheKey = buildCacheKey('course', 'list', query as Record<string, unknown>);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const filter: FilterQuery<CourseDocument> = {};

  if (query.universityId) {
    filter['university.id'] = query.universityId;
  }
  if (query.faculty) {
    filter.faculty = query.faculty;
  }
  if (query.year) {
    filter.year = query.year;
  }
  if (query.semester) {
    filter.semester = query.semester;
  }
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const sortOption = buildSortOption(query.sort);

  const [courses, total] = await Promise.all([
    CourseModel.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
    CourseModel.countDocuments(filter),
  ]);

  const result = { items: courses, total, page, limit, pages: Math.ceil(total / limit) };

  await setCache(cacheKey, result, CACHE_TTL);

  if (query.search) {
    trackActivity('search_queries', { type: 'course' }, { query: query.search, resultCount: courses.length });
  }

  return result;
}

export async function getCourseById(id: string) {
  const cacheKey = `${CACHE_PREFIX}:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const course = await CourseModel.findById(id).lean();
  if (!course) return null;

  await setCache(cacheKey, course, CACHE_TTL);

  return course;
}

export async function createCourse(data: CreateCourseData, userId: string) {
  const course = await CourseModel.create(data);

  await createCourseNode({
    id: course._id.toString(),
    title: course.title,
    code: course.code,
    faculty: course.faculty,
  });

  if (data.professor.id) {
    await linkProfessorToCourse(
      data.professor.id,
      course._id.toString(),
      data.semester
    );
  }

  trackActivity(
    'user_activity',
    { action: 'course_created', targetType: 'course' },
    { userId, targetId: course._id.toString(), count: 1 }
  );

  return course.toObject();
}

export async function enrollInCourse(studentId: string, courseId: string) {
  const course = await CourseModel.findById(courseId).lean();
  if (!course) {
    throw new ServiceError('Курс не найден', 'NOT_FOUND');
  }

  const enrolled = await enrollStudent(studentId, courseId, course.semester);
  if (!enrolled) {
    throw new ServiceError('Не удалось записаться на курс', 'BAD_REQUEST');
  }

  await CourseModel.findByIdAndUpdate(courseId, {
    $inc: { 'stats.enrolledCount': 1 },
  });

  await deleteCache(`${CACHE_PREFIX}:${courseId}`);

  trackActivity(
    'user_activity',
    { action: 'course_enrolled', targetType: 'course' },
    { userId: studentId, targetId: courseId, count: 1 }
  );

  return { success: true };
}

export async function getPrerequisites(courseId: string) {
  return getPrerequisiteChain(courseId);
}

export async function getRecommendations(studentId: string) {
  return getCourseRecommendations(studentId);
}

export async function getEnrolledStudents(courseId: string) {
  return getCourseStudents(courseId);
}
