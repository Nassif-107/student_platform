/**
 * Neo4j constraint and index verification tests.
 * Ensures uniqueness constraints and property indexes created in
 * ensureConstraints() are present in the database.
 */
import { describe, it, expect } from 'vitest';
import { runCypher } from '../../src/config/neo4j.js';

describe('Neo4j Constraints', () => {
  it('student_id_unique constraint exists', async () => {
    const result = await runCypher('SHOW CONSTRAINTS');
    const names = result.records.map((r) => r.get('name') as string);
    expect(names).toContain('student_id_unique');
  });

  it('course_id_unique constraint exists', async () => {
    const result = await runCypher('SHOW CONSTRAINTS');
    const names = result.records.map((r) => r.get('name') as string);
    expect(names).toContain('course_id_unique');
  });

  it('professor_id_unique constraint exists', async () => {
    const result = await runCypher('SHOW CONSTRAINTS');
    const names = result.records.map((r) => r.get('name') as string);
    expect(names).toContain('professor_id_unique');
  });

  it('group_id_unique constraint exists', async () => {
    const result = await runCypher('SHOW CONSTRAINTS');
    const names = result.records.map((r) => r.get('name') as string);
    expect(names).toContain('group_id_unique');
  });

  it('event_id_unique constraint exists', async () => {
    const result = await runCypher('SHOW CONSTRAINTS');
    const names = result.records.map((r) => r.get('name') as string);
    expect(names).toContain('event_id_unique');
  });
});

describe('Neo4j Property Indexes', () => {
  it('student faculty index exists', async () => {
    const result = await runCypher('SHOW INDEXES');
    const indexNames = result.records.map((r) => r.get('name') as string);
    expect(indexNames).toContain('student_faculty_idx');
  });

  it('student university index exists', async () => {
    const result = await runCypher('SHOW INDEXES');
    const indexNames = result.records.map((r) => r.get('name') as string);
    expect(indexNames).toContain('student_university_idx');
  });

  it('student year index exists', async () => {
    const result = await runCypher('SHOW INDEXES');
    const indexNames = result.records.map((r) => r.get('name') as string);
    expect(indexNames).toContain('student_year_idx');
  });

  it('course code index exists', async () => {
    const result = await runCypher('SHOW INDEXES');
    const indexNames = result.records.map((r) => r.get('name') as string);
    expect(indexNames).toContain('course_code_idx');
  });

  it('course faculty index exists', async () => {
    const result = await runCypher('SHOW INDEXES');
    const indexNames = result.records.map((r) => r.get('name') as string);
    expect(indexNames).toContain('course_faculty_idx');
  });

  it('professor faculty index exists', async () => {
    const result = await runCypher('SHOW INDEXES');
    const indexNames = result.records.map((r) => r.get('name') as string);
    expect(indexNames).toContain('professor_faculty_idx');
  });
});
