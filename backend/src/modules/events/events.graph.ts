import { runCypher, runCypherWrite } from '../../config/neo4j.js';

interface EventNodeData {
  id: string;
  title: string;
  type: string;
  date: string;
}

export async function createEventNode(event: EventNodeData): Promise<void> {
  await runCypherWrite(
    `MERGE (e:Event {id: $id})
     ON CREATE SET e.title = $title, e.type = $type, e.date = $date
     ON MATCH SET e.title = $title, e.type = $type, e.date = $date`,
    { id: event.id, title: event.title, type: event.type, date: event.date }
  );
}

export async function addAttendance(studentId: string, eventId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (s:Student {id: $studentId})
     MATCH (e:Event {id: $eventId})
     MERGE (s)-[:ATTENDING]->(e)`,
    { studentId, eventId }
  );
}

export async function removeAttendance(studentId: string, eventId: string): Promise<void> {
  await runCypherWrite(
    `MATCH (s:Student {id: $studentId})-[r:ATTENDING]->(e:Event {id: $eventId})
     DELETE r`,
    { studentId, eventId }
  );
}

export async function getAttendingFriends(
  eventId: string,
  userId: string
): Promise<Array<{ id: string; firstName: string; lastName: string }>> {
  const result = await runCypher(
    `MATCH (me:Student {id: $myId})-[:FRIENDS_WITH]-(friend:Student)-[:ATTENDING]->(e:Event {id: $eventId})
     RETURN friend.id AS id, friend.firstName AS firstName, friend.lastName AS lastName`,
    { myId: userId, eventId }
  );

  return result.records.map((r) => ({
    id: r.get('id') as string,
    firstName: r.get('firstName') as string,
    lastName: r.get('lastName') as string,
  }));
}
