import { runCypher, runCypherWrite, toNeo4jNumber } from '../../config/neo4j.js';

interface CourseNodeData {
  id: string;
  title: string;
  code: string;
  faculty: string;
}

export async function createCourseNode(course: CourseNodeData): Promise<void> {
  await runCypherWrite(
    `MERGE (c:Course {id: $id})
     ON CREATE SET c.title = $title, c.code = $code, c.faculty = $faculty
     ON MATCH SET c.title = $title, c.code = $code, c.faculty = $faculty`,
    { id: course.id, title: course.title, code: course.code, faculty: course.faculty }
  );
}

export async function linkProfessorToCourse(
  professorId: string,
  courseId: string,
  semester: number
): Promise<void> {
  await runCypherWrite(
    `MATCH (p:Professor {id: $professorId})
     MATCH (c:Course {id: $courseId})
     MERGE (p)-[:TEACHES {semester: $semester}]->(c)`,
    { professorId, courseId, semester }
  );
}

export async function addPrerequisite(
  courseId: string,
  prereqId: string
): Promise<void> {
  await runCypherWrite(
    `MATCH (c:Course {id: $courseId})
     MATCH (p:Course {id: $prereqId})
     MERGE (c)-[:REQUIRES]->(p)`,
    { courseId, prereqId }
  );
}

export async function enrollStudent(
  studentId: string,
  courseId: string,
  semester: number
): Promise<boolean> {
  const result = await runCypherWrite(
    `MATCH (s:Student {id: $studentId})
     MATCH (c:Course {id: $courseId})
     MERGE (s)-[r:ENROLLED_IN]->(c)
     ON CREATE SET r.semester = $semester, r.status = 'active', r.enrolledAt = datetime()
     RETURN r.status AS status`,
    { studentId, courseId, semester }
  );
  return result.records.length > 0;
}

export async function getPrerequisiteChain(courseId: string): Promise<{
  nodes: Array<{ id: string; title: string; code: string }>;
  edges: Array<{ from: string; to: string }>;
}> {
  const result = await runCypher(
    `MATCH path = (c:Course {id: $courseId})-[:REQUIRES*1..10]->(prereq:Course)
     UNWIND nodes(path) AS node
     UNWIND relationships(path) AS rel
     WITH COLLECT(DISTINCT {id: node.id, title: node.title, code: node.code}) AS nodes,
          COLLECT(DISTINCT {from: startNode(rel).id, to: endNode(rel).id}) AS edges
     RETURN nodes, edges`,
    { courseId }
  );

  if (result.records.length === 0) {
    return { nodes: [], edges: [] };
  }

  const record = result.records[0]!;
  return {
    nodes: record.get('nodes') as Array<{ id: string; title: string; code: string }>,
    edges: record.get('edges') as Array<{ from: string; to: string }>,
  };
}

export async function getCourseRecommendations(
  studentId: string
): Promise<Array<{ id: string; title: string; code: string; popularity: number }>> {
  const result = await runCypher(
    `MATCH (s:Student {id: $studentId})
     MATCH (similar:Student)
     WHERE similar.faculty = s.faculty AND similar.year = s.year AND similar.id <> s.id
     MATCH (similar)-[:ENROLLED_IN]->(rec:Course)
     WHERE NOT (s)-[:ENROLLED_IN]->(rec)
     RETURN rec.id AS id, rec.title AS title, rec.code AS code,
            COUNT(DISTINCT similar) AS popularity
     ORDER BY popularity DESC
     LIMIT 5`,
    { studentId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    title: r.get('title') as string,
    code: r.get('code') as string,
    popularity: toNeo4jNumber(r.get('popularity')),
  }));
}

export async function getCourseStudents(
  courseId: string
): Promise<Array<{ id: string; firstName: string; lastName: string; status: string }>> {
  const result = await runCypher(
    `MATCH (s:Student)-[r:ENROLLED_IN]->(c:Course {id: $courseId})
     RETURN s.id AS id, s.firstName AS firstName, s.lastName AS lastName, r.status AS status
     ORDER BY s.lastName, s.firstName`,
    { courseId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
    status: r.get('status') as string,
  }));
}
