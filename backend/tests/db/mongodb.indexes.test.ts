/**
 * MongoDB index verification tests.
 * Ensures all important indexes exist on each collection so queries
 * are backed by index scans rather than collection scans.
 */
import mongoose from 'mongoose';
import { describe, it, expect, beforeEach } from 'vitest';
import { cleanMongo } from '../helpers.js';

// Models are already registered by setup.ts; we only need the connection.

beforeEach(cleanMongo);

/** Helper: get indexes for a collection, creating it first if needed. */
async function getIndexes(collectionName: string): Promise<mongoose.mongo.IndexDescriptionInfo[]> {
  const db = mongoose.connection.db!;
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (collections.length === 0) {
    // Force model sync so the collection + indexes are created
    const model = mongoose.models[collectionName.charAt(0).toUpperCase() + collectionName.slice(1)];
    if (model) {
      await model.createIndexes();
    } else {
      // Try to create collection manually and sync all
      await mongoose.connection.syncIndexes();
    }
  }
  return db.collection(collectionName).indexes();
}

/** Check if an index with the given key pattern exists. */
function hasIndex(
  indexes: mongoose.mongo.IndexDescriptionInfo[],
  keyPattern: Record<string, number | string>,
): boolean {
  return indexes.some((idx) => {
    const keys = idx.key ?? {};
    const patternEntries = Object.entries(keyPattern);
    if (Object.keys(keys).length < patternEntries.length) return false;
    return patternEntries.every(([k, v]) => keys[k] === v);
  });
}

describe('MongoDB Indexes — users', () => {
  it('email unique index exists', async () => {
    await mongoose.model('User').createIndexes();
    const indexes = await getIndexes('users');
    const emailIdx = indexes.find((idx) => idx.key?.email === 1);
    expect(emailIdx).toBeDefined();
    expect(emailIdx!.unique).toBe(true);
  });

  it('text search index exists', async () => {
    await mongoose.model('User').createIndexes();
    const indexes = await getIndexes('users');
    const textIdx = indexes.find((idx) =>
      Object.values(idx.key ?? {}).includes('text'),
    );
    expect(textIdx).toBeDefined();
  });
});

describe('MongoDB Indexes — courses', () => {
  it('text search index exists', async () => {
    await mongoose.model('Course').createIndexes();
    const indexes = await getIndexes('courses');
    const textIdx = indexes.find((idx) =>
      Object.values(idx.key ?? {}).includes('text'),
    );
    expect(textIdx).toBeDefined();
  });

  it('university + faculty compound index exists', async () => {
    await mongoose.model('Course').createIndexes();
    const indexes = await getIndexes('courses');
    expect(hasIndex(indexes, { 'university.id': 1, faculty: 1 })).toBe(true);
  });
});

describe('MongoDB Indexes — materials', () => {
  it('course.id + createdAt compound index exists', async () => {
    await mongoose.model('Material').createIndexes();
    const indexes = await getIndexes('materials');
    expect(hasIndex(indexes, { 'course.id': 1, createdAt: -1 })).toBe(true);
  });

  it('text search index exists', async () => {
    await mongoose.model('Material').createIndexes();
    const indexes = await getIndexes('materials');
    const textIdx = indexes.find((idx) =>
      Object.values(idx.key ?? {}).includes('text'),
    );
    expect(textIdx).toBeDefined();
  });

  it('downloads index exists', async () => {
    await mongoose.model('Material').createIndexes();
    const indexes = await getIndexes('materials');
    expect(hasIndex(indexes, { 'stats.downloads': -1 })).toBe(true);
  });
});

describe('MongoDB Indexes — reviews', () => {
  it('target compound index exists', async () => {
    await mongoose.model('Review').createIndexes();
    const indexes = await getIndexes('reviews');
    expect(
      hasIndex(indexes, { 'target.type': 1, 'target.id': 1, status: 1, createdAt: -1 }),
    ).toBe(true);
  });

  it('author unique compound index exists', async () => {
    await mongoose.model('Review').createIndexes();
    const indexes = await getIndexes('reviews');
    const authorIdx = indexes.find(
      (idx) =>
        idx.key?.['author.id'] === 1 &&
        idx.key?.['target.type'] === 1 &&
        idx.key?.['target.id'] === 1 &&
        idx.unique === true,
    );
    expect(authorIdx).toBeDefined();
  });
});

describe('MongoDB Indexes — forum (questions)', () => {
  it('tags index exists', async () => {
    await mongoose.model('Question').createIndexes();
    const indexes = await getIndexes('questions');
    expect(hasIndex(indexes, { tags: 1 })).toBe(true);
  });

  it('course.id + createdAt index exists', async () => {
    await mongoose.model('Question').createIndexes();
    const indexes = await getIndexes('questions');
    expect(hasIndex(indexes, { 'course.id': 1, createdAt: -1 })).toBe(true);
  });
});

describe('MongoDB Indexes — deadlines', () => {
  it('course.id + dueDate index exists', async () => {
    await mongoose.model('Deadline').createIndexes();
    const indexes = await getIndexes('deadlines');
    expect(hasIndex(indexes, { 'course.id': 1, dueDate: 1 })).toBe(true);
  });
});

describe('MongoDB Indexes — notifications', () => {
  it('userId + createdAt index exists', async () => {
    await mongoose.model('Notification').createIndexes();
    const indexes = await getIndexes('notifications');
    expect(hasIndex(indexes, { userId: 1, createdAt: -1 })).toBe(true);
  });

  it('TTL index exists', async () => {
    await mongoose.model('Notification').createIndexes();
    const indexes = await getIndexes('notifications');
    const ttlIdx = indexes.find(
      (idx) => idx.key?.createdAt === 1 && typeof idx.expireAfterSeconds === 'number',
    );
    expect(ttlIdx).toBeDefined();
    expect(ttlIdx!.expireAfterSeconds).toBe(2592000);
  });
});
