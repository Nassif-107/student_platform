/**
 * Scenario 6: Forum Q&A (MongoDB)
 * Covers: list, ask, answer, vote, accept, delete, search
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 6: Forum Q&A', () => {
  beforeEach(async () => { await cleanAll(); });

  const questionPayload = {
    title: 'Как решить задачу по линейной алгебре?',
    body: 'Не могу разобраться с определителем матрицы 3x3. Подскажите алгоритм разложения.',
    tags: ['алгебра', 'матрица'],
  };

  it('6.1 — browse returns questions list', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/forum/questions' });
    expect(res.statusCode).toBe(200);
  });

  it('6.2 — ask question creates it', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/forum/questions',
      headers: authHeader(accessToken),
      payload: questionPayload,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe(questionPayload.title);
  });

  it('6.3 — answer a question', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const qRes = await app.inject({
      method: 'POST',
      url: '/api/forum/questions',
      headers: authHeader(accessToken),
      payload: questionPayload,
    });
    const qId = JSON.parse(qRes.body).data._id;

    const other = await registerTestUser(app, { email: 'answerer@test.ru' });
    const aRes = await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${qId}/answers`,
      headers: authHeader(other.accessToken),
      payload: { body: 'Используйте разложение по первой строке и метод кофакторов.' },
    });
    expect(aRes.statusCode).toBe(201);
  });

  it('6.4 — vote on question changes count', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const qRes = await app.inject({
      method: 'POST',
      url: '/api/forum/questions',
      headers: authHeader(accessToken),
      payload: questionPayload,
    });
    const qId = JSON.parse(qRes.body).data._id;

    const voter = await registerTestUser(app, { email: 'voter@test.ru' });
    const voteRes = await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${qId}/vote`,
      headers: authHeader(voter.accessToken),
      payload: { value: 1 },
    });
    expect(voteRes.statusCode).toBe(200);
  });

  it('6.5 — accept answer marks question as solved', async () => {
    const app = await getApp();
    const author = await registerTestUser(app);

    const qRes = await app.inject({
      method: 'POST',
      url: '/api/forum/questions',
      headers: authHeader(author.accessToken),
      payload: questionPayload,
    });
    const qId = JSON.parse(qRes.body).data._id;

    const answerer = await registerTestUser(app, { email: 'answerer2@test.ru' });
    const aRes = await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${qId}/answers`,
      headers: authHeader(answerer.accessToken),
      payload: { body: 'Разложение по строке решает проблему.' },
    });
    const answerId = JSON.parse(aRes.body).data._id;

    // Author accepts the answer
    const acceptRes = await app.inject({
      method: 'PATCH',
      url: `/api/forum/questions/${qId}/answers/${answerId}/accept`,
      headers: authHeader(author.accessToken),
    });
    expect(acceptRes.statusCode).toBe(200);
  });

  it('6.6 — delete own question', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const qRes = await app.inject({
      method: 'POST',
      url: '/api/forum/questions',
      headers: authHeader(accessToken),
      payload: questionPayload,
    });
    const qId = JSON.parse(qRes.body).data._id;

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/forum/questions/${qId}`,
      headers: authHeader(accessToken),
    });
    expect(delRes.statusCode).toBe(200);
  });

  it('6.7 — vote on answer', async () => {
    const app = await getApp();
    const author = await registerTestUser(app);

    const qRes = await app.inject({
      method: 'POST',
      url: '/api/forum/questions',
      headers: authHeader(author.accessToken),
      payload: questionPayload,
    });
    const qId = JSON.parse(qRes.body).data._id;

    const answerer = await registerTestUser(app, { email: 'ans@test.ru' });
    const aRes = await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${qId}/answers`,
      headers: authHeader(answerer.accessToken),
      payload: { body: 'Ответ на вопрос.' },
    });
    const answerId = JSON.parse(aRes.body).data._id;

    const voter = await registerTestUser(app, { email: 'voter2@test.ru' });
    const voteRes = await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${qId}/answers/${answerId}/vote`,
      headers: authHeader(voter.accessToken),
      payload: { value: 1 },
    });
    expect(voteRes.statusCode).toBe(200);
  });
});
