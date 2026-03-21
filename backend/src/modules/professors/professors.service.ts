import { type FilterQuery } from 'mongoose';
import { ProfessorModel, type ProfessorDocument } from './professors.model.js';
import { runCypher } from '../../config/neo4j.js';
import { getCache, setCache } from '../../utils/cache.js';

interface ProfessorQuery {
  universityId?: string;
  faculty?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const CACHE_PREFIX = 'app:cache:professor';
const CACHE_TTL = 600;

export async function getProfessors(query: ProfessorQuery) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  const filter: FilterQuery<ProfessorDocument> = {};

  if (query.universityId) {
    filter['university.id'] = query.universityId;
  }
  if (query.faculty) {
    filter.faculty = query.faculty;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [{ 'name.first': searchRegex }, { 'name.last': searchRegex }, { department: searchRegex }];
  }

  const [items, total] = await Promise.all([
    ProfessorModel.find(filter)
      .sort({ 'stats.avgRating': -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProfessorModel.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getProfessorById(id: string) {
  const cacheKey = `${CACHE_PREFIX}:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const professor = await ProfessorModel.findById(id).lean();
  if (!professor) return null;

  await setCache(cacheKey, professor, CACHE_TTL);

  return professor;
}

export async function getProfessorCourses(professorId: string) {
  const cacheKey = `${CACHE_PREFIX}:${professorId}:courses`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const result = await runCypher(
    `MATCH (p:Professor {id: $profId})-[r:TEACHES]->(c:Course)
     RETURN c.id AS id, c.title AS title, c.code AS code,
            c.faculty AS faculty, r.semester AS semester
     ORDER BY c.title`,
    { profId: professorId }
  );

  const courses = result.records.map((r) => ({
    id: r.get('id') as string,
    title: r.get('title') as string,
    code: r.get('code') as string,
    faculty: r.get('faculty') as string,
    semester: r.get('semester') as number,
  }));

  await setCache(cacheKey, courses, CACHE_TTL);

  return courses;
}

export async function createProfessor(data: {
  name: { first: string; last: string; patronymic?: string };
  university?: { id?: string; name?: string };
  faculty?: string;
  department?: string;
  position?: string;
  email?: string;
}) {
  const professor = await ProfessorModel.create(data);
  return professor.toObject();
}
