/**
 * Mongoose schema validation tests.
 * Verifies that models reject invalid data at the schema level.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { UserModel } from '../../src/modules/users/users.model.js';
import { CourseModel } from '../../src/modules/courses/courses.model.js';
import { MaterialModel } from '../../src/modules/materials/materials.model.js';
import { ReviewModel } from '../../src/modules/reviews/reviews.model.js';
import { cleanMongo } from '../helpers.js';

beforeEach(cleanMongo);

describe('UserModel validation', () => {
  it('rejects missing email (required)', async () => {
    const user = new UserModel({
      passwordHash: '$2b$12$fakehashvalue1234567890',
      name: { first: 'Иван', last: 'Петров' },
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      specialization: 'ПИ',
      year: 2,
    });

    await expect(user.validate()).rejects.toThrow();
  });

  it('rejects invalid role', async () => {
    const user = new UserModel({
      email: 'invalid-role@university.ru',
      passwordHash: '$2b$12$fakehashvalue1234567890',
      role: 'superadmin',
      name: { first: 'Иван', last: 'Петров' },
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      specialization: 'ПИ',
      year: 2,
    });

    await expect(user.validate()).rejects.toThrow();
  });

  it('accepts a valid user with all required fields', async () => {
    const user = new UserModel({
      email: 'valid@university.ru',
      passwordHash: '$2b$12$fakehashvalue1234567890',
      name: { first: 'Иван', last: 'Петров' },
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      specialization: 'ПИ',
      year: 2,
    });

    // Should not throw
    await expect(user.validate()).resolves.toBeUndefined();
  });
});

describe('CourseModel validation', () => {
  it('rejects invalid type (not обязательный/по выбору/факультатив)', async () => {
    const course = new CourseModel({
      title: 'Тестовый курс',
      code: 'TST101',
      description: 'Описание',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 2,
      semester: 1,
      type: 'elective', // English — should fail
      credits: 4,
      professor: { name: 'Проф. Тестов' },
    });

    await expect(course.validate()).rejects.toThrow();
  });

  it('accepts valid type "обязательный"', async () => {
    const course = new CourseModel({
      title: 'Тестовый курс',
      code: 'TST101',
      description: 'Описание',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 2,
      semester: 1,
      type: 'обязательный',
      credits: 4,
      professor: { name: 'Проф. Тестов' },
    });

    await expect(course.validate()).resolves.toBeUndefined();
  });

  it('accepts valid type "по выбору"', async () => {
    const course = new CourseModel({
      title: 'Курс по выбору',
      code: 'ELC101',
      description: 'Описание',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 3,
      semester: 2,
      type: 'по выбору',
      credits: 3,
      professor: { name: 'Проф. Другой' },
    });

    await expect(course.validate()).resolves.toBeUndefined();
  });

  it('accepts valid type "факультатив"', async () => {
    const course = new CourseModel({
      title: 'Факультатив',
      code: 'FAC101',
      description: 'Описание',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 1,
      semester: 1,
      type: 'факультатив',
      credits: 2,
      professor: { name: 'Проф. Факультативный' },
    });

    await expect(course.validate()).resolves.toBeUndefined();
  });
});

describe('MaterialModel validation', () => {
  it('rejects invalid type (not конспект/лабораторная/etc.)', async () => {
    const material = new MaterialModel({
      title: 'Материал',
      course: {
        id: new mongoose.Types.ObjectId(),
        title: 'Курс',
        code: 'CS101',
      },
      type: 'lecture_notes', // English — should fail
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Автор',
      },
      files: [],
    });

    await expect(material.validate()).rejects.toThrow();
  });

  it('accepts valid type "конспект"', async () => {
    const material = new MaterialModel({
      title: 'Конспект лекции',
      course: {
        id: new mongoose.Types.ObjectId(),
        title: 'Курс',
        code: 'CS101',
      },
      type: 'конспект',
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Автор',
      },
      files: [],
    });

    await expect(material.validate()).resolves.toBeUndefined();
  });

  it('accepts valid type "лабораторная"', async () => {
    const material = new MaterialModel({
      title: 'Лабораторная работа',
      course: {
        id: new mongoose.Types.ObjectId(),
        title: 'Курс',
        code: 'CS101',
      },
      type: 'лабораторная',
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Автор',
      },
      files: [],
    });

    await expect(material.validate()).resolves.toBeUndefined();
  });
});

describe('ReviewModel validation', () => {
  it('rejects overall rating below 1', async () => {
    const review = new ReviewModel({
      target: {
        type: 'course',
        id: new mongoose.Types.ObjectId(),
        name: 'Курс',
      },
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Рецензент',
      },
      ratings: {
        overall: 0,
        difficulty: 5,
        usefulness: 5,
      },
      text: 'Текст отзыва',
      semester: '2025-1',
    });

    await expect(review.validate()).rejects.toThrow();
  });

  it('rejects overall rating above 10', async () => {
    const review = new ReviewModel({
      target: {
        type: 'course',
        id: new mongoose.Types.ObjectId(),
        name: 'Курс',
      },
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Рецензент',
      },
      ratings: {
        overall: 11,
        difficulty: 5,
        usefulness: 5,
      },
      text: 'Текст отзыва',
      semester: '2025-1',
    });

    await expect(review.validate()).rejects.toThrow();
  });

  it('accepts valid rating between 1 and 10', async () => {
    const review = new ReviewModel({
      target: {
        type: 'course',
        id: new mongoose.Types.ObjectId(),
        name: 'Курс',
      },
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Рецензент',
      },
      ratings: {
        overall: 8,
        difficulty: 5,
        usefulness: 7,
      },
      text: 'Текст отзыва',
      semester: '2025-1',
    });

    await expect(review.validate()).resolves.toBeUndefined();
  });
});
