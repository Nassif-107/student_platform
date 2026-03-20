import { runCypher, runCypherWrite, toNeo4jNumber } from '../../config/neo4j.js';

export interface TeamCandidate {
  id: string;
  firstName: string;
  lastName: string;
  reputation: number;
  mutualFriends: number;
  sharedCourses: number;
  matchedSkills: number;
  score: number;
}

export async function findTeammates(
  myId: string,
  courseId: string,
  requiredSkills: string[] = []
): Promise<TeamCandidate[]> {
  const result = await runCypher(
    `MATCH (me:Student {id: $myId})-[:ENROLLED_IN]->(c:Course {id: $courseId})<-[:ENROLLED_IN]-(candidate:Student)
     WHERE candidate.id <> $myId
       AND NOT (me)-[:BLOCKED]-(candidate)
     OPTIONAL MATCH (me)-[:FRIENDS_WITH]-(mutual)-[:FRIENDS_WITH]-(candidate)
     WITH candidate, count(DISTINCT mutual) as mutualFriends
     OPTIONAL MATCH (candidate)-[:ENROLLED_IN]->(shared:Course)<-[:ENROLLED_IN]-(me2:Student {id: $myId})
     WITH candidate, mutualFriends, count(DISTINCT shared) as sharedCourses
     OPTIONAL MATCH (candidate)-[:HAS_SKILL]->(skill:Skill)
     WHERE skill.name IN $requiredSkills
     WITH candidate, mutualFriends, sharedCourses, count(skill) as matchedSkills
     RETURN candidate.id as id, candidate.firstName as firstName, candidate.lastName as lastName, candidate.reputation as reputation,
            mutualFriends, sharedCourses, matchedSkills,
            (mutualFriends * 3 + sharedCourses * 2 + matchedSkills * 5 + candidate.reputation * 0.1) as score
     ORDER BY score DESC
     LIMIT 20`,
    { myId, courseId, requiredSkills }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
    reputation: toNeo4jNumber(r.get('reputation')),
    mutualFriends: toNeo4jNumber(r.get('mutualFriends')),
    sharedCourses: toNeo4jNumber(r.get('sharedCourses')),
    matchedSkills: toNeo4jNumber(r.get('matchedSkills')),
    score: toNeo4jNumber(r.get('score')),
  }));
}

export async function addMemberToGroup(studentId: string, groupId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (s:Student {id: $studentId})
     MERGE (g:Group {id: $groupId})
     MERGE (s)-[:MEMBER_OF]->(g)`,
    { studentId, groupId }
  );
}

export async function removeMemberFromGroup(studentId: string, groupId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (s:Student {id: $studentId})-[r:MEMBER_OF]->(g:Group {id: $groupId})
     DELETE r`,
    { studentId, groupId }
  );
}
