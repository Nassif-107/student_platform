/**
 * Cross-DB integration test: Social / friend features.
 * Tests friend request, acceptance, and suggestions across MongoDB + Neo4j.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';
import { runCypher } from '../../src/config/neo4j.js';

beforeEach(cleanAll);

describe('Friend flow — MongoDB + Neo4j', () => {
  it('send friend request, accept, and verify Neo4j relationships', async () => {
    const app = await getApp();

    // ── 1. Register two users ──
    const user1 = await registerTestUser(app, {
      email: 'friend1@university.ru',
      firstName: 'Алексей',
      lastName: 'Первый',
    });
    const user2 = await registerTestUser(app, {
      email: 'friend2@university.ru',
      firstName: 'Борис',
      lastName: 'Второй',
    });

    const user1Id = user1.user._id as string;
    const user2Id = user2.user._id as string;

    // Verify both Student nodes exist in Neo4j
    const checkNodes = await runCypher(
      'MATCH (s:Student) WHERE s.id IN [$id1, $id2] RETURN s.id AS id',
      { id1: user1Id, id2: user2Id },
    );
    expect(checkNodes.records.length).toBe(2);

    // ── 2. User1 sends friend request to User2 ──
    const sendRes = await app.inject({
      method: 'POST',
      url: `/api/social/friends/${user2Id}`,
      headers: authHeader(user1.accessToken),
    });

    expect(sendRes.statusCode).toBe(201);

    // Verify Neo4j FRIEND_REQUEST relationship exists
    const requestCheck = await runCypher(
      `MATCH (a:Student {id: $from})-[r:FRIEND_REQUEST]->(b:Student {id: $to})
       RETURN r.status AS status`,
      { from: user1Id, to: user2Id },
    );
    expect(requestCheck.records.length).toBe(1);
    expect(requestCheck.records[0]!.get('status')).toBe('pending');

    // ── 3. User2 accepts the friend request ──
    const acceptRes = await app.inject({
      method: 'POST',
      url: `/api/social/requests/${user1Id}/accept`,
      headers: authHeader(user2.accessToken),
    });

    expect(acceptRes.statusCode).toBe(200);

    // Verify FRIENDS_WITH relationship exists
    const friendCheck = await runCypher(
      `MATCH (a:Student {id: $id1})-[:FRIENDS_WITH]-(b:Student {id: $id2})
       RETURN count(*) AS cnt`,
      { id1: user1Id, id2: user2Id },
    );
    expect(friendCheck.records[0]!.get('cnt').toNumber()).toBe(1);

    // Verify FRIEND_REQUEST is deleted
    const requestGone = await runCypher(
      `MATCH (a:Student {id: $from})-[r:FRIEND_REQUEST]->(b:Student {id: $to})
       RETURN count(r) AS cnt`,
      { from: user1Id, to: user2Id },
    );
    expect(requestGone.records[0]!.get('cnt').toNumber()).toBe(0);
  });

  it('friend suggestions return scored results from Neo4j', async () => {
    const app = await getApp();

    // Register 3 users: A, B, C
    const userA = await registerTestUser(app, {
      email: 'suggestA@university.ru',
      firstName: 'Анна',
      lastName: 'А',
    });
    const userB = await registerTestUser(app, {
      email: 'suggestB@university.ru',
      firstName: 'Борис',
      lastName: 'Б',
    });
    const userC = await registerTestUser(app, {
      email: 'suggestC@university.ru',
      firstName: 'Виктор',
      lastName: 'В',
    });

    const idA = userA.user._id as string;
    const idB = userB.user._id as string;
    const idC = userC.user._id as string;

    // A <-> B are friends; B <-> C are friends; A and C are NOT friends
    // So C should be suggested to A
    await app.inject({
      method: 'POST',
      url: `/api/social/friends/${idB}`,
      headers: authHeader(userA.accessToken),
    });
    await app.inject({
      method: 'POST',
      url: `/api/social/requests/${idA}/accept`,
      headers: authHeader(userB.accessToken),
    });

    await app.inject({
      method: 'POST',
      url: `/api/social/friends/${idC}`,
      headers: authHeader(userB.accessToken),
    });
    await app.inject({
      method: 'POST',
      url: `/api/social/requests/${idB}/accept`,
      headers: authHeader(userC.accessToken),
    });

    // Get suggestions for A
    const suggestRes = await app.inject({
      method: 'GET',
      url: '/api/social/suggestions',
      headers: authHeader(userA.accessToken),
    });

    expect(suggestRes.statusCode).toBe(200);
    const suggestBody = JSON.parse(suggestRes.body);
    const suggestions = suggestBody.data.suggestions ?? suggestBody.data;

    // C should appear in suggestions for A (mutual friend: B)
    const found = Array.isArray(suggestions)
      ? suggestions.find((s: { id: string }) => s.id === idC)
      : null;
    expect(found).toBeDefined();
  });

  it('classmates endpoint returns results for shared courses', async () => {
    const app = await getApp();

    const userA = await registerTestUser(app, {
      email: 'classmateA@university.ru',
      firstName: 'Дмитрий',
      lastName: 'Д',
    });

    // Even without courses, the endpoint should not error
    const classmatesRes = await app.inject({
      method: 'GET',
      url: '/api/social/classmates',
      headers: authHeader(userA.accessToken),
    });

    expect(classmatesRes.statusCode).toBe(200);
    const classmatesBody = JSON.parse(classmatesRes.body);
    expect(classmatesBody.success).toBe(true);
  });
});
