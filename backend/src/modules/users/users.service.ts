import { UserModel, type UserDocument } from './users.model.js';
import { updateStudentNode } from './users.graph.js';
import { getCache, setCache, deleteCache, buildCacheKey } from '../../utils/cache.js';
import { getInfluxQueryApi } from '../../config/influx.js';
import { sanitizeIdForFlux } from '../../utils/validate-id.js';
import { logger } from '../../utils/logger.js';
import { MaterialModel } from '../materials/materials.model.js';
import { ServiceError } from '../../utils/service-error.js';

const USER_CACHE_TTL = 300; // 5 minutes

export async function getUserById(id: string): Promise<Omit<UserDocument, 'passwordHash'> | null> {
  const cacheKey = buildCacheKey('user', id);

  const cached = await getCache<Omit<UserDocument, 'passwordHash'>>(cacheKey);
  if (cached) return cached;

  const user = await UserModel.findById(id).select('-passwordHash').lean();
  if (!user) return null;

  await setCache(cacheKey, user, USER_CACHE_TTL);
  return user as unknown as Omit<UserDocument, 'passwordHash'>;
}

interface ProfileUpdateData {
  name?: { first?: string; last?: string; patronymic?: string };
  faculty?: string;
  specialization?: string;
  year?: number;
  avatar?: string;
  bio?: string;
  socialLinks?: { telegram?: string; vk?: string; github?: string; phone?: string };
  skills?: string[];
  interests?: string[];
  settings?: Partial<UserDocument['settings']>;
}

export async function updateProfile(
  userId: string,
  requesterId: string,
  data: ProfileUpdateData
): Promise<UserDocument | null> {
  if (userId !== requesterId) {
    throw new ServiceError('Доступ запрещён', 'FORBIDDEN');
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: flattenUpdate(data as unknown as Record<string, unknown>) },
    { new: true, runValidators: true }
  ).select('-passwordHash').lean();

  if (!user) return null;

  // Sync relevant fields to Neo4j
  const graphUpdates: Record<string, unknown> = {};
  if (data.name?.first) graphUpdates.firstName = data.name.first;
  if (data.name?.last) graphUpdates.lastName = data.name.last;
  if (data.faculty) graphUpdates.faculty = data.faculty;
  if (data.year) graphUpdates.year = data.year;

  if (Object.keys(graphUpdates).length > 0) {
    await updateStudentNode(userId, graphUpdates as Parameters<typeof updateStudentNode>[1]);
  }

  await deleteCache(buildCacheKey('user', userId));

  return user as unknown as UserDocument;
}

export async function getUserActivity(
  userId: string,
  page: number,
  limit: number
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const safeId = sanitizeIdForFlux(userId);
  if (!safeId) return { items: [], total: 0 };

  const offset = (page - 1) * limit;
  const queryApi = getInfluxQueryApi();

  const fluxQuery = `
    from(bucket: "student-platform")
      |> range(start: -30d)
      |> filter(fn: (r) => r["_measurement"] == "user_activity")
      |> filter(fn: (r) => r["userId"] == "${safeId}")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${limit}, offset: ${offset})
  `;

  const items: Record<string, unknown>[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          items.push(tableMeta.toObject(row));
        },
        error(err) {
          reject(err);
        },
        complete() {
          resolve();
        },
      });
    });
  } catch (err) {
    logger.error(err, '[Users] InfluxDB activity query failed for user %s', userId);
    return { items: [], total: 0 };
  }

  return { items, total: items.length };
}

export async function getUserMaterials(
  userId: string,
  page: number,
  limit: number
): Promise<{ items: unknown[]; total: number }> {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    MaterialModel.find({ 'author.id': userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-likedBy')
      .lean(),
    MaterialModel.countDocuments({ 'author.id': userId }),
  ]);

  return { items, total };
}

export async function searchUsers(
  query: string,
  page: number,
  limit: number
): Promise<{ items: unknown[]; total: number }> {
  const skip = (page - 1) * limit;

  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { 'name.first': searchRegex },
      { 'name.last': searchRegex },
      { email: searchRegex },
      { faculty: searchRegex },
    ],
  };

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .select('-passwordHash')
      .sort({ 'stats.reputation': -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return { items, total };
}

/**
 * Flatten nested update object into dot-notation keys for MongoDB $set.
 * Handles arrays (kept as-is) and Dates (kept as-is).
 * e.g. { name: { first: 'A' } } → { 'name.first': 'A' }
 */
function flattenUpdate(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, flattenUpdate(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
