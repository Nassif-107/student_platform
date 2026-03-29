import type { FilterQuery, Types } from 'mongoose';
import { QuestionModel, AnswerModel, type QuestionDocument } from './forum.model.js';
import { UserModel } from '../users/users.model.js';
import { runCypher } from '../../config/neo4j.js';
import { getRedis } from '../../config/redis.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getCache, setCache, buildCacheKey, deleteCachePattern } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const CACHE_TTL = 300; // 5 minutes

interface QuestionQuery {
  courseId?: string;
  tags?: string[];
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface AuthorInfo {
  id: string;
  name: string;
  avatar?: string;
}

// ---------- Get Questions (list) ----------

export async function getQuestions(query: QuestionQuery) {
  const cacheKey = buildCacheKey('forum', 'questions', query as Record<string, unknown>);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const { courseId, tags, status, search, sort = '-createdAt', page = 1, limit = 20 } = query;
  const filter: FilterQuery<QuestionDocument> = {};

  if (courseId) filter['course.id'] = courseId;
  if (tags && tags.length > 0) filter.tags = { $in: tags };
  if (status) filter.status = status;
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [{ title: searchRegex }, { body: searchRegex }, { tags: searchRegex }];
  }

  const skip = (page - 1) * limit;
  const sortObj: Record<string, 1 | -1> = {};

  if (search) {
    sortObj.score = { $meta: 'textScore' } as unknown as 1;
  } else if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [questions, total] = await Promise.all([
    QuestionModel.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    QuestionModel.countDocuments(filter),
  ]);

  if (search) {
    trackActivity('search_queries', { type: 'forum' }, { query: search, resultCount: questions.length });
  }

  const result = { questions, total, page, limit };
  await setCache(cacheKey, result, CACHE_TTL);
  return result;
}

// ---------- Get Question by ID ----------

export async function getQuestionById(id: string, answersPage = 1, answersLimit = 20) {
  const cacheKey = buildCacheKey('forum', 'question', id);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const question = await QuestionModel.findById(id).lean();
  if (!question) return null;

  await QuestionModel.updateOne({ _id: id }, { $inc: { views: 1 } });

  const skip = (answersPage - 1) * answersLimit;
  const [answers, totalAnswers] = await Promise.all([
    AnswerModel.find({ questionId: id })
      .sort({ isAccepted: -1, votes: -1 })
      .skip(skip)
      .limit(answersLimit)
      .lean(),
    AnswerModel.countDocuments({ questionId: id }),
  ]);

  trackActivity(
    'forum_activity',
    { action: 'view_question' },
    { questionId: id, views: question.views + 1 }
  );

  const result = { question, answers, totalAnswers, answersPage, answersLimit };
  await setCache(cacheKey, result, CACHE_TTL);
  return result;
}

// ---------- Create Question ----------

export async function createQuestion(
  data: { title: string; body: string; courseId?: string; courseTitle?: string; tags?: string[]; attachments?: unknown[] },
  user: AuthorInfo
) {
  const question = await QuestionModel.create({
    title: data.title,
    body: data.body,
    course: data.courseId ? { id: data.courseId, title: data.courseTitle } : undefined,
    author: { id: user.id, name: user.name, avatar: user.avatar },
    tags: data.tags ?? [],
    attachments: data.attachments ?? [],
  });

  await UserModel.updateOne(
    { _id: user.id },
    { $inc: { 'stats.reputation': 3, 'stats.questionsAsked': 1 } }
  );

  if (data.courseId) {
    notifyCourseExperts(data.courseId, question._id.toString(), data.title).catch((err) => logger.error(err, '[Forum] Failed to notify course experts'));
  }

  await deleteCachePattern('app:cache:forum:*');

  trackActivity(
    'forum_activity',
    { action: 'create_question' },
    { userId: user.id, questionId: question._id.toString() }
  );

  return question.toObject();
}

// ---------- Create Answer ----------

export async function createAnswer(questionId: string, body: string, user: AuthorInfo, attachments: unknown[] = []) {
  const question = await QuestionModel.findById(questionId).lean();
  if (!question) return null;

  const answer = await AnswerModel.create({
    questionId,
    author: { id: user.id, name: user.name, avatar: user.avatar },
    body,
    attachments,
  });

  await QuestionModel.updateOne({ _id: questionId }, { $inc: { answerCount: 1 } });
  await UserModel.updateOne({ _id: user.id }, { $inc: { 'stats.reputation': 2 } });

  await deleteCachePattern('app:cache:forum:*');

  trackActivity(
    'forum_activity',
    { action: 'create_answer' },
    { userId: user.id, questionId, answerId: answer._id.toString() }
  );

  // Notify question author about the new answer
  if (question.author.id.toString() !== user.id) {
    await createNotification(
      question.author.id.toString(),
      'NEW_ANSWER',
      'Новый ответ на ваш вопрос',
      `${user.name} ответил на "${question.title}"`,
      `/forum/${questionId}`,
    );
  }

  return answer.toObject();
}

// ---------- Accept Answer ----------

export async function acceptAnswer(questionId: string, answerId: string, userId: string) {
  const question = await QuestionModel.findById(questionId).lean();
  if (!question) return { error: 'QUESTION_NOT_FOUND' as const };
  if (question.author.id.toString() !== userId) return { error: 'FORBIDDEN' as const };

  const answer = await AnswerModel.findOne({ _id: answerId, questionId }).lean();
  if (!answer) return { error: 'ANSWER_NOT_FOUND' as const };

  await AnswerModel.updateOne({ _id: answerId }, { $set: { isAccepted: true } });
  await QuestionModel.updateOne(
    { _id: questionId },
    { $set: { hasAcceptedAnswer: true, status: 'resolved' } }
  );
  await UserModel.updateOne(
    { _id: answer.author.id },
    { $inc: { 'stats.reputation': 5, 'stats.answersAccepted': 1 } }
  );

  await deleteCachePattern('app:cache:forum:*');

  // Notify the answer author that their answer was accepted
  if (answer.author.id.toString() !== userId) {
    await createNotification(
      answer.author.id.toString(),
      'ANSWER_ACCEPTED',
      'Ваш ответ принят',
      `Ваш ответ на "${question.title}" был принят как лучший`,
      `/forum/${questionId}`,
    );
  }

  return { success: true };
}

// ---------- Vote Answer ----------

export async function voteAnswer(answerId: string, userId: string, value: 1 | -1) {
  const answer = await AnswerModel.findById(answerId);
  if (!answer) return null;

  const existingIdx = answer.votedBy.findIndex((v) => v.userId.toString() === userId);
  let voteDelta = 0;

  if (existingIdx !== -1) {
    const existing = answer.votedBy[existingIdx]!;
    if (existing.value === value) {
      answer.votedBy.splice(existingIdx, 1);
      voteDelta = -value;
    } else {
      answer.votedBy[existingIdx]!.value = value;
      voteDelta = value * 2;
    }
  } else {
    answer.votedBy.push({ userId: userId as unknown as Types.ObjectId, value });
    voteDelta = value;
  }

  answer.votes += voteDelta;
  await answer.save();

  if (voteDelta > 0) {
    await UserModel.updateOne(
      { _id: answer.author.id },
      { $inc: { 'stats.reputation': 1 } }
    );
  }

  return { votes: answer.votes };
}

// ---------- Update Question ----------

export async function updateQuestion(
  questionId: string,
  userId: string,
  data: { title?: string; body?: string; tags?: string[] }
) {
  const question = await QuestionModel.findById(questionId);
  if (!question) return { error: 'QUESTION_NOT_FOUND' as const };
  if (question.author.id.toString() !== userId) return { error: 'FORBIDDEN' as const };

  if (data.title !== undefined) question.title = data.title;
  if (data.body !== undefined) question.body = data.body;
  if (data.tags !== undefined) question.tags = data.tags;

  await question.save();

  await deleteCachePattern('app:cache:forum:*');

  return { success: true, question: question.toObject() };
}

// ---------- Delete Question ----------

export async function deleteQuestion(questionId: string, userId: string, userRole: string) {
  const question = await QuestionModel.findById(questionId).lean();
  if (!question) return { error: 'QUESTION_NOT_FOUND' as const };

  const isAuthor = question.author.id.toString() === userId;
  const isModerator = userRole === 'moderator' || userRole === 'admin';

  if (!isAuthor && !isModerator) return { error: 'FORBIDDEN' as const };

  await AnswerModel.deleteMany({ questionId });
  await QuestionModel.deleteOne({ _id: questionId });

  await deleteCachePattern('app:cache:forum:*');

  if (isAuthor) {
    await UserModel.updateOne(
      { _id: userId },
      { $inc: { 'stats.reputation': -3, 'stats.questionsAsked': -1 } }
    );
  }

  return { success: true };
}

// ---------- Vote Question ----------

export async function voteQuestion(questionId: string, userId: string, value: 1 | -1) {
  const question = await QuestionModel.findById(questionId).lean();
  if (!question) return null;

  // QuestionModel doesn't have votedBy/votes by default, use a simple increment approach
  // For a full implementation, we'd need to add votedBy to the schema.
  // Here we use a Redis-based approach to track votes per user.
  const redis = await getRedis();
  const voteKey = `question:vote:${questionId}:${userId}`;
  const existing = await redis.get(voteKey);

  let voteDelta = 0;

  if (existing) {
    const existingValue = Number(existing);
    if (existingValue === value) {
      // Remove vote
      await redis.del(voteKey);
      voteDelta = -value;
    } else {
      // Change vote
      await redis.set(voteKey, String(value), 'EX', 2592000);
      voteDelta = value * 2;
    }
  } else {
    await redis.set(voteKey, String(value), 'EX', 2592000);
    voteDelta = value;
  }

  const updated = await QuestionModel.findByIdAndUpdate(
    questionId,
    { $inc: { votes: voteDelta } },
    { new: true }
  ).lean();

  if (voteDelta > 0) {
    await UserModel.updateOne(
      { _id: question.author.id },
      { $inc: { 'stats.reputation': 1 } }
    );
  }

  return { voted: value, delta: voteDelta };
}

// ---------- Helpers ----------

async function notifyCourseExperts(courseId: string, questionId: string, title: string) {
  const result = await runCypher(
    `MATCH (s:Student)-[r:ENROLLED_IN]->(c:Course {id: $courseId})
     WHERE r.status = 'completed' AND r.grade >= 4
     RETURN s.id AS id
     LIMIT 10`,
    { courseId }
  );

  if (result.records.length === 0) return;

  const redis = await getRedis();
  const pipeline = redis.pipeline();

  for (const record of result.records) {
    const expertId = record.get('id') as string;
    pipeline.publish(
      `notifications:${expertId}`,
      JSON.stringify({ type: 'expert_question', questionId, title })
    );
  }

  await pipeline.exec();
}
