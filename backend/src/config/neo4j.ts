import neo4j, {
  type Driver,
  type Integer,
  type QueryResult,
  type RecordShape,
} from 'neo4j-driver';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      env.NEO4J_URI,
      neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
        connectionTimeout: 5000,
      }
    );
    logger.info('[Neo4j] Driver created');
  }
  return driver;
}

export async function verifyNeo4j(): Promise<void> {
  const d = getNeo4jDriver();
  const serverInfo = await d.getServerInfo();
  logger.info('[Neo4j] Connected to %s', serverInfo.address);
  await ensureConstraints();
}

async function ensureConstraints(): Promise<void> {
  const constraints = [
    'CREATE CONSTRAINT student_id_unique IF NOT EXISTS FOR (s:Student) REQUIRE s.id IS UNIQUE',
    'CREATE CONSTRAINT course_id_unique IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT professor_id_unique IF NOT EXISTS FOR (p:Professor) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT group_id_unique IF NOT EXISTS FOR (g:Group) REQUIRE g.id IS UNIQUE',
    'CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE',
  ];

  const d = getNeo4jDriver();
  const session = d.session({ database: 'neo4j', defaultAccessMode: neo4j.session.WRITE });
  try {
    for (const constraint of constraints) {
      await session.run(constraint);
    }
    logger.info('[Neo4j] Uniqueness constraints ensured');

    const indexes = [
      'CREATE INDEX student_faculty_idx IF NOT EXISTS FOR (s:Student) ON (s.faculty)',
      'CREATE INDEX student_university_idx IF NOT EXISTS FOR (s:Student) ON (s.university)',
      'CREATE INDEX student_year_idx IF NOT EXISTS FOR (s:Student) ON (s.year)',
      'CREATE INDEX course_faculty_idx IF NOT EXISTS FOR (c:Course) ON (c.faculty)',
      'CREATE INDEX course_code_idx IF NOT EXISTS FOR (c:Course) ON (c.code)',
      'CREATE INDEX professor_faculty_idx IF NOT EXISTS FOR (p:Professor) ON (p.faculty)',
    ];

    for (const idx of indexes) {
      await session.run(idx);
    }
    logger.info('[Neo4j] Property indexes ensured');
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    logger.info('[Neo4j] Driver closed gracefully');
  }
}

export async function runCypher<T extends RecordShape = RecordShape>(
  query: string,
  params?: Record<string, unknown>
): Promise<QueryResult<T>> {
  const d = getNeo4jDriver();
  const session = d.session({ database: 'neo4j' });
  try {
    const result = await session.run<T>(query, params);
    return result;
  } finally {
    await session.close();
  }
}

export async function runCypherWrite<T extends RecordShape = RecordShape>(
  query: string,
  params?: Record<string, unknown>
): Promise<QueryResult<T>> {
  const d = getNeo4jDriver();
  const session = d.session({
    database: 'neo4j',
    defaultAccessMode: neo4j.session.WRITE,
  });
  try {
    const result = await session.executeWrite((tx) => tx.run<T>(query, params));
    return result;
  } finally {
    await session.close();
  }
}

/**
 * Safely convert a Neo4j Integer to a JS number.
 * Neo4j returns integers as { low, high } objects; this handles both formats.
 */
export function toNeo4jNumber(value: Integer | number | unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as Integer).toNumber === 'function') {
    return (value as Integer).toNumber();
  }
  return Number(value) || 0;
}
