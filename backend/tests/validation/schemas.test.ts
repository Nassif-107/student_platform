/**
 * Validation tests for Zod schemas from the shared package.
 */
import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  createReviewSchema,
  createMaterialSchema,
  createDeadlineSchema,
  createEventSchema,
} from '@student-platform/shared';

describe('loginSchema', () => {
  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'testpass' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'testpass' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({
      email: 'user@university.ru',
      password: 'testpass',
    });
    expect(result.success).toBe(true);
  });
});

describe('registerSchema', () => {
  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@university.ru',
      password: 'short',
      firstName: 'Иван',
      lastName: 'Петров',
      universityId: 'КубГТУ',
      faculty: 'ИКС',
      specialization: 'ПИ',
      year: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path.includes('password'));
      expect(pwError).toBeDefined();
    }
  });

  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'user@university.ru',
      password: 'securepassword123',
      firstName: 'Иван',
      lastName: 'Петров',
      universityId: 'КубГТУ',
      faculty: 'ИКС',
      specialization: 'ПИ',
      year: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe('createReviewSchema', () => {
  const validReview = {
    targetType: 'course' as const,
    targetId: '507f1f77bcf86cd799439011',
    targetName: 'Тестовый курс',
    ratings: {
      overall: 8,
      difficulty: 5,
    },
    text: 'Отличный курс, рекомендую всем студентам!',
    semester: '2025-1',
  };

  it('rejects rating greater than 10', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      ratings: { ...validReview.ratings, overall: 11 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating less than 1', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      ratings: { ...validReview.ratings, overall: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid review with rating 1-10', () => {
    const result = createReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });
});

describe('createMaterialSchema', () => {
  const validMaterial = {
    title: 'Конспект лекции 1',
    courseId: '507f1f77bcf86cd799439011',
    courseTitle: 'Математический анализ',
    type: 'конспект' as const,
  };

  it('rejects invalid type in English instead of Russian', () => {
    const result = createMaterialSchema.safeParse({
      ...validMaterial,
      type: 'synopsis',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid Russian type "конспект"', () => {
    const result = createMaterialSchema.safeParse(validMaterial);
    expect(result.success).toBe(true);
  });

  it('accepts valid type "лабораторная"', () => {
    const result = createMaterialSchema.safeParse({
      ...validMaterial,
      type: 'лабораторная',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid type "шпаргалка"', () => {
    const result = createMaterialSchema.safeParse({
      ...validMaterial,
      type: 'шпаргалка',
    });
    expect(result.success).toBe(true);
  });
});

describe('createDeadlineSchema', () => {
  it('accepts valid type "лабораторная"', () => {
    const result = createDeadlineSchema.safeParse({
      courseId: '507f1f77bcf86cd799439011',
      title: 'Лабораторная работа 1',
      type: 'лабораторная',
      dueDate: '2026-04-01T23:59:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid type "экзамен"', () => {
    const result = createDeadlineSchema.safeParse({
      courseId: '507f1f77bcf86cd799439011',
      title: 'Экзамен по курсу',
      type: 'экзамен',
      dueDate: '2026-06-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type in English', () => {
    const result = createDeadlineSchema.safeParse({
      courseId: '507f1f77bcf86cd799439011',
      title: 'Lab 1',
      type: 'laboratory',
      dueDate: '2026-04-01T23:59:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('createEventSchema', () => {
  it('accepts valid type "хакатон"', () => {
    const result = createEventSchema.safeParse({
      title: 'Весенний хакатон',
      type: 'хакатон',
      description: 'Ежегодный хакатон для студентов КубГТУ',
      location: 'Корпус 2, аудитория 301',
      date: '2026-04-20T09:00:00.000Z',
      time: '09:00',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid type "конференция"', () => {
    const result = createEventSchema.safeParse({
      title: 'Научная конференция',
      type: 'конференция',
      description: 'Конференция по информационным технологиям',
      location: 'Актовый зал',
      date: '2026-05-10T10:00:00.000Z',
      time: '10:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type in English', () => {
    const result = createEventSchema.safeParse({
      title: 'Hackathon',
      type: 'hackathon',
      description: 'A hackathon event',
      location: 'Room 301',
      date: '2026-04-20T09:00:00.000Z',
      time: '09:00',
    });
    expect(result.success).toBe(false);
  });
});
