/**
 * MongoDB connectivity and feature tests.
 * Verifies core Mongoose operations: CRUD, lean queries, text search,
 * aggregation pipelines, atomic operators, and TTL indexes.
 */
import mongoose from 'mongoose';
import { describe, it, expect, beforeEach } from 'vitest';
import { cleanMongo } from '../helpers.js';

const getUserModel = () => mongoose.model('User');
const getNotificationModel = () => mongoose.model('Notification');
const getMaterialModel = () => mongoose.model('Material');

beforeEach(cleanMongo);

describe('MongoDB', () => {
  it('should be connected', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('can create and read a document', async () => {
    const UserModel = getUserModel();
    const user = await UserModel.create({
      email: 'mongo-test@university.ru',
      passwordHash: '$2b$12$fakehashvalue1234567890',
      name: { first: 'Иван', last: 'Петров' },
      university: { name: 'КубГТУ' },
      faculty: 'Институт компьютерных систем',
      specialization: 'Прикладная информатика',
      year: 2,
    });

    const found = await UserModel.findById(user._id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe('mongo-test@university.ru');
    expect(found!.name.first).toBe('Иван');
  });

  it('.lean() returns a plain object, not a Mongoose document', async () => {
    const UserModel = getUserModel();
    await UserModel.create({
      email: 'lean-test@university.ru',
      passwordHash: '$2b$12$fakehashvalue1234567890',
      name: { first: 'Анна', last: 'Сидорова' },
      university: { name: 'КубГТУ' },
      faculty: 'Институт компьютерных систем',
      specialization: 'Прикладная информатика',
      year: 3,
    });

    const doc = await UserModel.findOne({ email: 'lean-test@university.ru' }).lean();
    expect(doc).not.toBeNull();
    // lean() result should NOT have Mongoose document methods
    expect(typeof (doc as Record<string, unknown>).save).toBe('undefined');
    // It should still have the data
    expect(doc!.name.first).toBe('Анна');
  });

  it('text index works ($text search on users)', async () => {
    const UserModel = getUserModel();
    await UserModel.create([
      {
        email: 'search1@university.ru',
        passwordHash: '$2b$12$fakehashvalue1234567890',
        name: { first: 'Алексей', last: 'Кузнецов' },
        university: { name: 'КубГТУ' },
        faculty: 'Институт компьютерных систем',
        specialization: 'Прикладная информатика',
        year: 1,
      },
      {
        email: 'search2@university.ru',
        passwordHash: '$2b$12$fakehashvalue1234567890',
        name: { first: 'Мария', last: 'Иванова' },
        university: { name: 'КубГТУ' },
        faculty: 'Экономический факультет',
        specialization: 'Бухгалтерский учёт',
        year: 2,
      },
    ]);

    const results = await UserModel.find({ $text: { $search: 'Алексей' } }).lean();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((u) => u.name.first === 'Алексей')).toBe(true);
  });

  it('aggregation pipeline works (group + count)', async () => {
    const UserModel = getUserModel();
    await UserModel.create([
      {
        email: 'agg1@university.ru',
        passwordHash: '$2b$12$fakehashvalue1234567890',
        name: { first: 'А', last: 'Б' },
        university: { name: 'КубГТУ' },
        faculty: 'ФакультетА',
        specialization: 'Спец1',
        year: 1,
      },
      {
        email: 'agg2@university.ru',
        passwordHash: '$2b$12$fakehashvalue1234567890',
        name: { first: 'В', last: 'Г' },
        university: { name: 'КубГТУ' },
        faculty: 'ФакультетА',
        specialization: 'Спец1',
        year: 2,
      },
      {
        email: 'agg3@university.ru',
        passwordHash: '$2b$12$fakehashvalue1234567890',
        name: { first: 'Д', last: 'Е' },
        university: { name: 'КубГТУ' },
        faculty: 'ФакультетБ',
        specialization: 'Спец2',
        year: 1,
      },
    ]);

    const pipeline = await UserModel.aggregate([
      { $group: { _id: '$faculty', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    expect(pipeline.length).toBe(2);
    const facultyA = pipeline.find((p: { _id: string }) => p._id === 'ФакультетА');
    expect(facultyA).toBeDefined();
    expect(facultyA.count).toBe(2);
  });

  it('atomic $inc works correctly', async () => {
    const UserModel = getUserModel();
    const user = await UserModel.create({
      email: 'inc-test@university.ru',
      passwordHash: '$2b$12$fakehashvalue1234567890',
      name: { first: 'Тест', last: 'Инк' },
      university: { name: 'КубГТУ' },
      faculty: 'Тестовый',
      specialization: 'Тест',
      year: 1,
    });

    await UserModel.updateOne(
      { _id: user._id },
      { $inc: { 'stats.reputation': 10, 'stats.materialsUploaded': 1 } },
    );

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.stats.reputation).toBe(10);
    expect(updated!.stats.materialsUploaded).toBe(1);

    // Increment again
    await UserModel.updateOne(
      { _id: user._id },
      { $inc: { 'stats.reputation': 5 } },
    );
    const again = await UserModel.findById(user._id).lean();
    expect(again!.stats.reputation).toBe(15);
  });

  it('$addToSet prevents duplicates', async () => {
    const UserModel = getUserModel();
    const user = await UserModel.create({
      email: 'addtoset@university.ru',
      passwordHash: '$2b$12$fakehashvalue1234567890',
      name: { first: 'Дуп', last: 'Тест' },
      university: { name: 'КубГТУ' },
      faculty: 'Тестовый',
      specialization: 'Тест',
      year: 1,
      skills: ['JavaScript'],
    });

    // Add same skill twice with $addToSet
    await UserModel.updateOne({ _id: user._id }, { $addToSet: { skills: 'Python' } });
    await UserModel.updateOne({ _id: user._id }, { $addToSet: { skills: 'Python' } });
    await UserModel.updateOne({ _id: user._id }, { $addToSet: { skills: 'TypeScript' } });

    const updated = await UserModel.findById(user._id).lean();
    expect(updated!.skills).toHaveLength(3);
    expect(updated!.skills).toEqual(expect.arrayContaining(['JavaScript', 'Python', 'TypeScript']));
  });

  it('TTL index exists on notifications collection', async () => {
    const NotificationModel = getNotificationModel();
    // Ensure the collection exists by inserting a document
    await NotificationModel.create({
      userId: new mongoose.Types.ObjectId(),
      type: 'MATERIAL_NEW',
      title: 'Тест TTL',
      message: 'Проверка TTL индекса',
    });

    const indexes = await mongoose.connection.db!.collection('notifications').indexes();
    const ttlIndex = indexes.find(
      (idx) => idx.key?.createdAt === 1 && typeof idx.expireAfterSeconds === 'number',
    );
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex!.expireAfterSeconds).toBe(2592000); // 30 days
  });

  it('compound indexes exist on materials (course.id + createdAt)', async () => {
    const MaterialModel = getMaterialModel();
    // Ensure the collection exists
    const courseId = new mongoose.Types.ObjectId();
    const authorId = new mongoose.Types.ObjectId();
    await MaterialModel.create({
      title: 'Тестовый материал',
      course: { id: courseId, title: 'Курс', code: 'CS101' },
      type: 'конспект',
      author: { id: authorId, name: 'Автор' },
      files: [{ filename: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', size: 1024, url: '/uploads/test.pdf' }],
    });

    const indexes = await mongoose.connection.db!.collection('materials').indexes();
    const compoundIndex = indexes.find(
      (idx) => idx.key?.['course.id'] === 1 && idx.key?.createdAt === -1,
    );
    expect(compoundIndex).toBeDefined();
  });
});
