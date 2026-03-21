/**
 * Unit tests for parsePagination utility.
 */
import { describe, it, expect } from 'vitest';
import { parsePagination } from '../../src/utils/pagination.js';

describe('parsePagination', () => {
  it('defaults to page 1, limit 20 when no params given', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('caps limit at 100', () => {
    const result = parsePagination({ page: 1, limit: 500 });
    expect(result.limit).toBe(100);
  });

  it('floors negative page to 1', () => {
    const result = parsePagination({ page: -5, limit: 10 });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('calculates skip correctly (page 3, limit 20 -> skip 40)', () => {
    const result = parsePagination({ page: 3, limit: 20 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(40);
  });

  it('handles string inputs from query params', () => {
    const result = parsePagination({ page: '2', limit: '15' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
    expect(result.skip).toBe(15);
  });

  it('defaults limit when NaN is provided', () => {
    const result = parsePagination({ page: 1, limit: 'abc' });
    expect(result.limit).toBe(20);
  });

  it('defaults page when NaN is provided', () => {
    const result = parsePagination({ page: 'abc', limit: 10 });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('floors fractional values', () => {
    const result = parsePagination({ page: 2.9, limit: 10.7 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(10);
  });
});
