/**
 * Unit tests for formatFullName utility.
 */
import { describe, it, expect } from 'vitest';
import { formatFullName } from '../../src/utils/format.js';

describe('formatFullName', () => {
  it('returns "First Last" for a basic name', () => {
    const result = formatFullName({ first: 'Иван', last: 'Петров' });
    expect(result).toBe('Иван Петров');
  });

  it('includes patronymic when present', () => {
    const result = formatFullName({
      first: 'Иван',
      last: 'Петров',
      patronymic: 'Сергеевич',
    });
    expect(result).toBe('Иван Петров Сергеевич');
  });

  it('handles empty strings gracefully', () => {
    const result = formatFullName({ first: '', last: '' });
    expect(result).toBe(' ');
  });

  it('omits patronymic when it is an empty string', () => {
    const result = formatFullName({ first: 'Анна', last: 'Сидорова', patronymic: '' });
    // Empty string is falsy, so patronymic should be omitted
    expect(result).toBe('Анна Сидорова');
  });
});
