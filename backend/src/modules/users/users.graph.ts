import { runCypher, runCypherWrite } from '../../config/neo4j.js';
import type { UserDocument } from './users.model.js';

interface StudentNodeData {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  university: string;
  faculty: string;
  year: number;
  reputation: number;
}

function toNodeData(user: UserDocument): StudentNodeData {
  return {
    id: user._id.toString(),
    firstName: user.name.first,
    lastName: user.name.last,
    avatar: user.avatar ?? '',
    university: user.university.name,
    faculty: user.faculty,
    year: user.year,
    reputation: user.stats.reputation,
  };
}

export async function createStudentNode(user: UserDocument): Promise<void> {
  const data = toNodeData(user);

  await runCypherWrite(
    `MERGE (s:Student { id: $id })
    ON CREATE SET
      s.firstName = $firstName,
      s.lastName = $lastName,
      s.avatar = $avatar,
      s.university = $university,
      s.faculty = $faculty,
      s.year = $year,
      s.reputation = $reputation
    ON MATCH SET
      s.firstName = $firstName,
      s.lastName = $lastName,
      s.avatar = $avatar,
      s.university = $university,
      s.faculty = $faculty,
      s.year = $year,
      s.reputation = $reputation`,
    data as unknown as Record<string, unknown>
  );
}

/** Allowlist of fields that can be updated on a Student node */
const UPDATABLE_STUDENT_FIELDS = new Set([
  'firstName', 'lastName', 'avatar', 'university', 'faculty', 'year', 'reputation',
]);

export async function updateStudentNode(
  userId: string,
  updates: Partial<Pick<StudentNodeData, 'firstName' | 'lastName' | 'avatar' | 'university' | 'faculty' | 'year' | 'reputation'>>
): Promise<void> {
  const safeKeys = Object.keys(updates).filter((key) => UPDATABLE_STUDENT_FIELDS.has(key));
  if (safeKeys.length === 0) return;

  const setClauses = safeKeys.map((key) => `s.${key} = $${key}`).join(', ');
  const safeParams: Record<string, unknown> = { id: userId };
  for (const key of safeKeys) {
    safeParams[key] = updates[key as keyof typeof updates];
  }

  await runCypherWrite(
    `MATCH (s:Student { id: $id }) SET ${setClauses}`,
    safeParams
  );
}

export async function deleteStudentNode(userId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (s:Student { id: $id }) DETACH DELETE s`,
    { id: userId }
  );
}

export async function getStudentNode(userId: string) {
  const result = await runCypher(
    `MATCH (s:Student { id: $id }) RETURN s`,
    { id: userId }
  );

  if (result.records.length === 0) return null;
  return result.records[0]?.get('s').properties as StudentNodeData;
}
