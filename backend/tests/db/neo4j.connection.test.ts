/**
 * Neo4j connectivity and graph feature tests.
 * Verifies driver connection, node/relationship CRUD, uniqueness constraints,
 * variable-length path queries, friend suggestions, and team matching.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getNeo4jDriver, runCypher, runCypherWrite, toNeo4jNumber } from '../../src/config/neo4j.js';
import { cleanNeo4j } from '../helpers.js';

beforeEach(cleanNeo4j);

describe('Neo4j', () => {
  it('connection works (getServerInfo returns address)', async () => {
    const driver = getNeo4jDriver();
    const info = await driver.getServerInfo();
    expect(info.address).toBeDefined();
    expect(typeof info.address).toBe('string');
  });

  it('can create a node (MERGE Student)', async () => {
    await runCypherWrite(
      `MERGE (s:Student {id: $id})
       ON CREATE SET s.firstName = $firstName, s.lastName = $lastName, s.faculty = $faculty`,
      { id: 'student-1', firstName: 'Иван', lastName: 'Петров', faculty: 'ИКС' },
    );

    const result = await runCypher(
      'MATCH (s:Student {id: $id}) RETURN s.firstName AS firstName',
      { id: 'student-1' },
    );

    expect(result.records.length).toBe(1);
    expect(result.records[0]!.get('firstName')).toBe('Иван');
  });

  it('can create a relationship (ENROLLED_IN)', async () => {
    await runCypherWrite(
      `MERGE (s:Student {id: $sid}) ON CREATE SET s.firstName = 'Тест'
       MERGE (c:Course {id: $cid}) ON CREATE SET c.title = 'Алгоритмы', c.code = 'CS201'
       MERGE (s)-[:ENROLLED_IN {semester: 1}]->(c)`,
      { sid: 'student-enroll', cid: 'course-algo' },
    );

    const result = await runCypher(
      `MATCH (s:Student {id: $sid})-[r:ENROLLED_IN]->(c:Course {id: $cid})
       RETURN c.title AS title, r.semester AS semester`,
      { sid: 'student-enroll', cid: 'course-algo' },
    );

    expect(result.records.length).toBe(1);
    expect(result.records[0]!.get('title')).toBe('Алгоритмы');
  });

  it('uniqueness constraint prevents duplicate nodes', async () => {
    await runCypherWrite(
      'CREATE (s:Student {id: $id, firstName: $name})',
      { id: 'unique-test', name: 'Первый' },
    );

    await expect(
      runCypherWrite(
        'CREATE (s:Student {id: $id, firstName: $name})',
        { id: 'unique-test', name: 'Дубликат' },
      ),
    ).rejects.toThrow();
  });

  it('variable-length path query works (prerequisites *1..5)', async () => {
    // Build a chain: CS300 -> CS200 -> CS100
    await runCypherWrite(
      `MERGE (c1:Course {id: 'cs100'}) ON CREATE SET c1.title = 'Основы', c1.code = 'CS100'
       MERGE (c2:Course {id: 'cs200'}) ON CREATE SET c2.title = 'Продвинутый', c2.code = 'CS200'
       MERGE (c3:Course {id: 'cs300'}) ON CREATE SET c3.title = 'Экспертный', c3.code = 'CS300'
       MERGE (c3)-[:REQUIRES]->(c2)
       MERGE (c2)-[:REQUIRES]->(c1)`,
    );

    const result = await runCypher(
      `MATCH path = (c:Course {id: 'cs300'})-[:REQUIRES*1..5]->(prereq:Course)
       RETURN prereq.id AS id
       ORDER BY prereq.id`,
    );

    const ids = result.records.map((r) => r.get('id') as string);
    expect(ids).toContain('cs200');
    expect(ids).toContain('cs100');
    expect(ids.length).toBe(2);
  });

  it('multi-hop friend suggestion query returns scored results', async () => {
    // Create students: A is friends with B, B is friends with C
    // A should get C as a suggestion
    await runCypherWrite(
      `MERGE (a:Student {id: 'sug-a'}) ON CREATE SET a.firstName = 'Алиса', a.lastName = 'А'
       MERGE (b:Student {id: 'sug-b'}) ON CREATE SET b.firstName = 'Борис', b.lastName = 'Б'
       MERGE (c:Student {id: 'sug-c'}) ON CREATE SET c.firstName = 'Ваня', c.lastName = 'В'
       MERGE (a)-[:FRIENDS_WITH]-(b)
       MERGE (b)-[:FRIENDS_WITH]-(c)`,
    );

    const result = await runCypher(
      `MATCH (me:Student {id: $myId})-[:FRIENDS_WITH]-(friend)-[:FRIENDS_WITH]-(suggestion:Student)
       WHERE NOT (me)-[:FRIENDS_WITH]-(suggestion) AND suggestion.id <> $myId
       WITH suggestion, count(DISTINCT friend) as mutualCount
       RETURN suggestion.id AS id, suggestion.firstName AS firstName,
              mutualCount, (mutualCount * 3) AS relevance
       ORDER BY relevance DESC
       LIMIT 10`,
      { myId: 'sug-a' },
    );

    expect(result.records.length).toBe(1);
    expect(result.records[0]!.get('id')).toBe('sug-c');
    expect(toNeo4jNumber(result.records[0]!.get('mutualCount'))).toBe(1);
    expect(toNeo4jNumber(result.records[0]!.get('relevance'))).toBe(3);
  });

  it('team matching query returns candidates with score', async () => {
    // Create students enrolled in the same course
    await runCypherWrite(
      `MERGE (me:Student {id: 'team-me'}) ON CREATE SET me.firstName = 'Я', me.reputation = 10
       MERGE (c1:Student {id: 'team-c1'}) ON CREATE SET c1.firstName = 'Кандидат1', c1.reputation = 20
       MERGE (c2:Student {id: 'team-c2'}) ON CREATE SET c2.firstName = 'Кандидат2', c2.reputation = 5
       MERGE (course:Course {id: 'team-course'}) ON CREATE SET course.title = 'Проект'
       MERGE (me)-[:ENROLLED_IN]->(course)
       MERGE (c1)-[:ENROLLED_IN]->(course)
       MERGE (c2)-[:ENROLLED_IN]->(course)`,
    );

    const result = await runCypher(
      `MATCH (me:Student {id: $myId})-[:ENROLLED_IN]->(c:Course {id: $courseId})<-[:ENROLLED_IN]-(candidate:Student)
       WHERE candidate.id <> $myId
       OPTIONAL MATCH (me)-[:FRIENDS_WITH]-(mutual)-[:FRIENDS_WITH]-(candidate)
       WITH candidate, count(DISTINCT mutual) as mutualFriends
       RETURN candidate.id as id, candidate.firstName as firstName,
              candidate.reputation as reputation, mutualFriends,
              (mutualFriends * 3 + candidate.reputation * 0.1) as score
       ORDER BY score DESC`,
      { myId: 'team-me', courseId: 'team-course' },
    );

    expect(result.records.length).toBe(2);
    // Candidate with higher reputation should have higher score
    const first = result.records[0]!;
    expect(first.get('firstName')).toBe('Кандидат1');
    expect(toNeo4jNumber(first.get('score'))).toBeGreaterThan(0);
  });

  it('can delete node and relationships (DETACH DELETE)', async () => {
    await runCypherWrite(
      `MERGE (s:Student {id: 'del-me'}) ON CREATE SET s.firstName = 'Удаляемый'
       MERGE (c:Course {id: 'del-course'})
       MERGE (s)-[:ENROLLED_IN]->(c)`,
    );

    await runCypherWrite(
      'MATCH (s:Student {id: $id}) DETACH DELETE s',
      { id: 'del-me' },
    );

    const result = await runCypher(
      'MATCH (s:Student {id: $id}) RETURN s',
      { id: 'del-me' },
    );
    expect(result.records.length).toBe(0);
  });
});
