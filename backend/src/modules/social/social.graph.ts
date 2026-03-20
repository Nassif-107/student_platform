import { runCypher, runCypherWrite, toNeo4jNumber } from '../../config/neo4j.js';

export interface FriendNode {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  faculty?: string;
}

export interface SuggestionNode {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  faculty?: string;
  mutualCount: number;
  sharedCourses: number;
  relevance: number;
}

export interface ClassmateNode {
  id: string;
  firstName: string;
  lastName: string;
  sharedCourses: number;
  courseNames: string[];
}

export async function queryFriends(userId: string): Promise<FriendNode[]> {
  const result = await runCypher(
    `MATCH (me:Student {id: $userId})-[:FRIENDS_WITH]-(friend:Student)
     RETURN friend.id AS id, friend.firstName AS firstName,
            friend.lastName AS lastName, friend.avatar AS avatar,
            friend.faculty AS faculty
     ORDER BY friend.lastName, friend.firstName`,
    { userId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
    avatar: r.get('avatar') as string | undefined,
    faculty: r.get('faculty') as string | undefined,
  }));
}

export async function createFriendship(userId: string, friendId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (a:Student {id: $userId})
     MATCH (b:Student {id: $friendId})
     MERGE (a)-[:FRIENDS_WITH]-(b)`,
    { userId, friendId }
  );
}

export async function deleteFriendship(userId: string, friendId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (a:Student {id: $userId})-[r:FRIENDS_WITH]-(b:Student {id: $friendId})
     DELETE r`,
    { userId, friendId }
  );
}

export async function querySuggestions(userId: string): Promise<SuggestionNode[]> {
  const result = await runCypher(
    `MATCH (me:Student {id: $myId})-[:FRIENDS_WITH]-(friend)-[:FRIENDS_WITH]-(suggestion:Student)
     WHERE NOT (me)-[:FRIENDS_WITH]-(suggestion) AND suggestion.id <> $myId
     WITH suggestion, count(DISTINCT friend) as mutualCount
     OPTIONAL MATCH (me2:Student {id: $myId})-[:ENROLLED_IN]->(c:Course)<-[:ENROLLED_IN]-(suggestion)
     WITH suggestion, mutualCount, count(DISTINCT c) as sharedCourses
     RETURN suggestion.id AS id, suggestion.firstName AS firstName,
            suggestion.lastName AS lastName, suggestion.avatar AS avatar,
            suggestion.faculty AS faculty,
            mutualCount, sharedCourses,
            (mutualCount * 3 + sharedCourses * 2) AS relevance
     ORDER BY relevance DESC
     LIMIT 10`,
    { myId: userId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
    avatar: r.get('avatar') as string | undefined,
    faculty: r.get('faculty') as string | undefined,
    mutualCount: toNeo4jNumber(r.get('mutualCount')),
    sharedCourses: toNeo4jNumber(r.get('sharedCourses')),
    relevance: toNeo4jNumber(r.get('relevance')),
  }));
}

export async function queryClassmates(
  userId: string
): Promise<ClassmateNode[]> {
  const result = await runCypher(
    `MATCH (me:Student {id: $userId})-[:ENROLLED_IN]->(c:Course)<-[:ENROLLED_IN]-(classmate:Student)
     WHERE classmate.id <> $userId
     WITH classmate, collect(DISTINCT c.title) AS courseNames, count(DISTINCT c) AS sharedCourses
     WHERE sharedCourses >= 2
     RETURN classmate.id AS id, classmate.firstName AS firstName,
            classmate.lastName AS lastName,
            sharedCourses, courseNames
     ORDER BY sharedCourses DESC
     LIMIT 50`,
    { userId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
    sharedCourses: toNeo4jNumber(r.get('sharedCourses')),
    courseNames: r.get('courseNames') as string[],
  }));
}

export async function sendFriendRequest(fromId: string, toId: string): Promise<boolean> {
  const result = await runCypherWrite(
    `MATCH (a:Student {id: $fromId})
     MATCH (b:Student {id: $toId})
     WHERE NOT (a)-[:FRIENDS_WITH]-(b) AND NOT (a)-[:FRIEND_REQUEST]->(b)
     CREATE (a)-[:FRIEND_REQUEST {status: 'pending', createdAt: datetime()}]->(b)
     RETURN b.id AS id`,
    { fromId, toId }
  );
  return result.records.length > 0;
}

// ---------- Friend Requests ----------

export interface FriendRequestNode {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  faculty?: string;
  requestedAt: string;
}

export async function queryPendingRequests(userId: string): Promise<FriendRequestNode[]> {
  const result = await runCypher(
    `MATCH (sender:Student)-[r:FRIEND_REQUEST]->(me:Student {id: $userId})
     WHERE r.status = 'pending'
     RETURN sender.id AS id, sender.firstName AS firstName,
            sender.lastName AS lastName, sender.avatar AS avatar,
            sender.faculty AS faculty,
            toString(r.createdAt) AS requestedAt
     ORDER BY r.createdAt DESC`,
    { userId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
    avatar: r.get('avatar') as string | undefined,
    faculty: r.get('faculty') as string | undefined,
    requestedAt: r.get('requestedAt') as string,
  }));
}

export async function acceptFriendRequest(userId: string, senderId: string): Promise<boolean> {
  const result = await runCypherWrite(
    `MATCH (sender:Student {id: $senderId})-[r:FRIEND_REQUEST]->(me:Student {id: $userId})
     WHERE r.status = 'pending'
     DELETE r
     WITH sender, me
     MERGE (sender)-[:FRIENDS_WITH]-(me)
     RETURN sender.id AS id`,
    { userId, senderId }
  );

  return result.records.length > 0;
}

export async function rejectFriendRequest(userId: string, senderId: string): Promise<boolean> {
  const result = await runCypherWrite(
    `MATCH (sender:Student {id: $senderId})-[r:FRIEND_REQUEST]->(me:Student {id: $userId})
     WHERE r.status = 'pending'
     DELETE r
     RETURN sender.id AS id`,
    { userId, senderId }
  );

  return result.records.length > 0;
}
