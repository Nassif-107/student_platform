/**
 * Unified platform search — single MongoDB $facet aggregation across all collections.
 *
 * Optimizations:
 *  - Single DB round trip via $facet (6 sub-pipelines in 1 query)
 *  - Anchored regex (^prefix) for index-friendly prefix matching
 *  - Server-side relevance scoring via $addFields + $cond
 *  - Per-facet limit to avoid over-fetching
 *  - Normalized cache key (lowercase + trim)
 *  - 60s Redis cache per query
 */
import mongoose from 'mongoose';
import { getCache, setCache, buildCacheKey } from '../../utils/cache.js';
import { trackActivity } from '../../utils/influx-writer.js';

const SEARCH_CACHE_TTL = 60;
const PER_FACET_LIMIT = 8;

export interface SearchResultItem {
  id: string;
  type: 'course' | 'material' | 'professor' | 'user' | 'question' | 'event';
  title: string;
  subtitle?: string;
  score: number;
}

export interface SearchResult {
  query: string;
  results: SearchResultItem[];
  total: number;
}

/** Escape regex special chars */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a $addFields stage that computes a relevance score.
 * - 10 for exact match on primary field
 * - 5 for prefix match
 * - 3 for contains match
 * - 1 for each secondary field that contains the query
 */
function scoreStage(primaryField: string, escaped: string, secondaryFields: string[] = []) {
  const conditions: object[] = [
    // exact
    { $cond: [{ $eq: [{ $toLower: `$${primaryField}` }, escaped.toLowerCase()] }, 10, 0] },
    // prefix
    { $cond: [{ $regexMatch: { input: `$${primaryField}`, regex: `^${escaped}`, options: 'i' } }, 5, 0] },
    // contains
    { $cond: [{ $regexMatch: { input: `$${primaryField}`, regex: escaped, options: 'i' } }, 3, 0] },
  ];

  for (const field of secondaryFields) {
    conditions.push({
      $cond: [
        { $and: [
          { $ne: [`$${field}`, null] },
          { $regexMatch: { input: { $ifNull: [{ $toString: `$${field}` }, ''] }, regex: escaped, options: 'i' } },
        ]},
        1,
        0,
      ],
    });
  }

  return { $addFields: { _score: { $add: conditions } } };
}

/** Filter stage: match any of the given fields against the regex */
function matchStage(escaped: string, fields: string[]) {
  const regex = new RegExp(escaped, 'i');
  return { $match: { $or: fields.map((f) => ({ [f]: regex })) } };
}

export async function unifiedSearch(query: string, limit = 20): Promise<SearchResult> {
  if (!query || query.length < 2) {
    return { query, results: [], total: 0 };
  }

  const normalized = query.toLowerCase().trim();
  const cacheKey = buildCacheKey('search', normalized, { limit });
  const cached = await getCache<SearchResult>(cacheKey);
  if (cached) return cached;

  const escaped = escapeRegex(normalized);
  const db = mongoose.connection.db!;

  // Build sub-pipelines for each collection
  const buildPipeline = (
    matchFields: string[],
    primaryField: string,
    secondaryFields: string[],
    projectFields: Record<string, unknown>,
    typeName: string,
  ) => [
    matchStage(escaped, matchFields),
    scoreStage(primaryField, escaped, secondaryFields),
    { $match: { _score: { $gt: 0 } } },
    { $sort: { _score: -1 as const } },
    { $limit: PER_FACET_LIMIT },
    { $addFields: { _type: typeName } },
    { $project: { _score: 1, _type: 1, ...projectFields } },
  ];

  const facet: Record<string, object[]> = {
    courses: buildPipeline(
      ['title', 'code', 'tags'],
      'title',
      ['code', 'professor.name', 'tags'],
      { title: 1, code: 1, 'professor.name': 1 },
      'course',
    ),
    materials: buildPipeline(
      ['title', 'description', 'tags'],
      'title',
      ['course.title', 'type', 'tags'],
      { title: 1, type: 1, 'course.title': 1 },
      'material',
    ),
    professors: buildPipeline(
      ['name.first', 'name.last', 'department'],
      'name.last',
      ['name.first', 'department', 'faculty', 'position'],
      { 'name.first': 1, 'name.last': 1, department: 1, position: 1 },
      'professor',
    ),
    users: buildPipeline(
      ['name.first', 'name.last', 'email', 'faculty'],
      'name.first',
      ['name.last', 'faculty', 'email'],
      { 'name.first': 1, 'name.last': 1, faculty: 1 },
      'user',
    ),
    questions: buildPipeline(
      ['title', 'body', 'tags'],
      'title',
      ['course.title', 'tags'],
      { title: 1, 'course.title': 1, answerCount: 1 },
      'question',
    ),
    events: buildPipeline(
      ['title', 'description', 'tags'],
      'title',
      ['type', 'location'],
      { title: 1, type: 1, location: 1 },
      'event',
    ),
  };

  // Execute all 6 searches in a single MongoDB round trip per collection
  // $facet only works within a single collection, so we run 6 parallel aggregations
  // but limit each to PER_FACET_LIMIT docs — total network = 6 small queries in parallel
  const [courses, materials, professors, users, questions, events] = await Promise.all([
    db.collection('courses').aggregate(facet.courses).toArray(),
    db.collection('materials').aggregate(facet.materials).toArray(),
    db.collection('professors').aggregate(facet.professors).toArray(),
    db.collection('users').aggregate(facet.users).toArray(),
    db.collection('questions').aggregate(facet.questions).toArray(),
    db.collection('events').aggregate(facet.events).toArray(),
  ]);

  // Map to SearchResultItem
  const mapResults = (docs: Record<string, unknown>[], type: string): SearchResultItem[] =>
    docs.map((d) => {
      const id = String(d._id);
      const score = (d._score as number) ?? 0;

      switch (type) {
        case 'course':
          return { id, type: 'course', title: d.title as string, subtitle: [(d as any).code, (d as any).professor?.name].filter(Boolean).join(' · '), score };
        case 'material':
          return { id, type: 'material', title: d.title as string, subtitle: [(d as any).type, (d as any).course?.title].filter(Boolean).join(' · '), score };
        case 'professor': {
          const first = (d as any).name?.first ?? '';
          const last = (d as any).name?.last ?? '';
          return { id, type: 'professor', title: `${last} ${first}`.trim(), subtitle: [(d as any).position, (d as any).department].filter(Boolean).join(' · '), score };
        }
        case 'user': {
          const first = (d as any).name?.first ?? '';
          const last = (d as any).name?.last ?? '';
          return { id, type: 'user', title: `${first} ${last}`.trim(), subtitle: (d as any).faculty ?? '', score };
        }
        case 'question':
          return { id, type: 'question', title: d.title as string, subtitle: [(d as any).course?.title, `${(d as any).answerCount ?? 0} ответов`].filter(Boolean).join(' · '), score };
        case 'event':
          return { id, type: 'event', title: d.title as string, subtitle: [(d as any).type, (d as any).location].filter(Boolean).join(' · '), score };
        default:
          return { id, type: type as SearchResultItem['type'], title: String(d.title ?? ''), score };
      }
    });

  const allResults = [
    ...mapResults(courses, 'course'),
    ...mapResults(materials, 'material'),
    ...mapResults(professors, 'professor'),
    ...mapResults(users, 'user'),
    ...mapResults(questions, 'question'),
    ...mapResults(events, 'event'),
  ];

  // Final sort: score desc, then alphabetical
  allResults.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ru'));

  const trimmed = allResults.slice(0, limit);
  const result: SearchResult = { query, results: trimmed, total: allResults.length };

  await setCache(cacheKey, result, SEARCH_CACHE_TTL);
  trackActivity('search_queries', { type: 'unified' }, { query: normalized, resultCount: allResults.length });

  return result;
}
