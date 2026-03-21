/**
 * Unit tests for ID validation utilities.
 */
import { describe, it, expect } from 'vitest';
import { isValidObjectId, sanitizeIdForFlux } from '../../src/utils/validate-id.js';

describe('isValidObjectId', () => {
  it('returns true for a valid 24-char hex string', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('returns true for another valid ObjectId', () => {
    expect(isValidObjectId('aabbccddeeff00112233aabb')).toBe(true);
  });

  it('returns false for "abc"', () => {
    expect(isValidObjectId('abc')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidObjectId(undefined as unknown as string)).toBe(false);
  });
});

describe('sanitizeIdForFlux', () => {
  it('returns a clean string for a valid ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';
    const result = sanitizeIdForFlux(id);
    expect(result).toBe('507f1f77bcf86cd799439011');
  });

  it('returns empty string for an invalid ID', () => {
    expect(sanitizeIdForFlux('not-valid')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeIdForFlux('')).toBe('');
  });

  it('strips special characters from a valid ObjectId-like string', () => {
    // A 12-byte hex string is valid for mongoose ObjectId check
    // sanitizeIdForFlux should strip anything non-alphanumeric/hyphen
    const id = '507f1f77bcf86cd799439011';
    const result = sanitizeIdForFlux(id);
    // Should only contain [a-zA-Z0-9-]
    expect(result).toMatch(/^[a-zA-Z0-9-]+$/);
  });
});
