/**
 * Concurrency test: vote race condition.
 * Verifies that concurrent votes from different users are atomic
 * and the final vote count matches the number of unique voters.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

const getQuestionModel = () => mongoose.model('Question');
const getAnswerModel = () => mongoose.model('Answer');

beforeEach(cleanAll);

describe('Concurrent vote race', () => {
  it('5 simultaneous upvotes from different users produce correct vote count', async () => {
    const app = await getApp();

    // Register 5 different users
    const users = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        registerTestUser(app, {
          email: `voter${i}-${Date.now()}@university.ru`,
          firstName: `Голосующий${i}`,
          lastName: 'Тестов',
        }),
      ),
    );

    const QuestionModel = getQuestionModel();
    const AnswerModel = getAnswerModel();

    // Create a question
    const authorId = new mongoose.Types.ObjectId();
    const question = await QuestionModel.create({
      title: 'Вопрос для голосования',
      body: 'Тело вопроса для проверки конкурентного голосования',
      author: { id: authorId, name: 'Автор Вопроса' },
      tags: ['тест'],
    });

    // Create an answer to the question
    const answer = await AnswerModel.create({
      questionId: question._id,
      author: { id: authorId, name: 'Автор Ответа' },
      body: 'Ответ для проверки голосования',
    });

    const answerId = answer._id.toString();
    const questionId = question._id.toString();

    // Fire 5 simultaneous upvote requests from different users
    const requests = users.map((u) =>
      app.inject({
        method: 'POST',
        url: `/api/forum/questions/${questionId}/answers/${answerId}/vote`,
        headers: authHeader(u.accessToken),
        payload: { value: 1 },
      }),
    );

    const results = await Promise.all(requests);

    // All requests should succeed (200)
    for (const res of results) {
      expect(res.statusCode).toBe(200);
    }

    // Verify the final state: vote count should equal number of unique voters (5)
    const updatedAnswer = await AnswerModel.findById(answerId).lean();
    expect(updatedAnswer).not.toBeNull();
    expect(updatedAnswer!.votes).toBe(5);
    expect(updatedAnswer!.votedBy.length).toBe(5);

    // Verify all voter IDs are unique
    const voterIds = updatedAnswer!.votedBy.map((v) => v.userId.toString());
    const uniqueIds = new Set(voterIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('same user voting twice toggles their vote instead of duplicating', async () => {
    const app = await getApp();
    const { user, accessToken } = await registerTestUser(app);

    const QuestionModel = getQuestionModel();
    const AnswerModel = getAnswerModel();

    const authorId = new mongoose.Types.ObjectId();
    const question = await QuestionModel.create({
      title: 'Вопрос для двойного голосования',
      body: 'Тело вопроса',
      author: { id: authorId, name: 'Автор' },
    });

    const answer = await AnswerModel.create({
      questionId: question._id,
      author: { id: authorId, name: 'Автор' },
      body: 'Ответ',
    });

    const questionId = question._id.toString();
    const answerId = answer._id.toString();

    // Vote upvote
    await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${questionId}/answers/${answerId}/vote`,
      headers: authHeader(accessToken),
      payload: { value: 1 },
    });

    // Vote upvote again — should remove the vote (toggle)
    await app.inject({
      method: 'POST',
      url: `/api/forum/questions/${questionId}/answers/${answerId}/vote`,
      headers: authHeader(accessToken),
      payload: { value: 1 },
    });

    const updatedAnswer = await AnswerModel.findById(answerId).lean();
    expect(updatedAnswer!.votes).toBe(0);
    expect(updatedAnswer!.votedBy.length).toBe(0);
  });
});
