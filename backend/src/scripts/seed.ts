/**
 * Database Seed Script
 *
 * Populates all 4 databases with demo data for coursework presentation.
 * Run: npx tsx backend/src/scripts/seed.ts
 *
 * Creates:
 *   MongoDB  — users, courses, professors, materials, reviews, forum, groups, deadlines, marketplace, events
 *   Neo4j    — Student/Course/Professor nodes + relationships (enrollment, friendship, skills)
 *   InfluxDB — sample activity data (30 days of user actions)
 *   Redis    — leaderboard scores, presence warm-up
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { getNeo4jDriver, verifyNeo4j, closeNeo4j, runCypherWrite } from '../config/neo4j.js';
import { getInfluxWriteApi, closeInflux } from '../config/influx.js';
import { getRedis, closeRedis } from '../config/redis.js';
import { Point } from '@influxdata/influxdb-client';
import { logger } from '../utils/logger.js';

// ─── Configuration ──────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const PASSWORD = 'password123'; // demo password for all users

const UNIVERSITIES = [
  { name: 'КубГТУ' },
  { name: 'КубГУ' },
];

const FACULTIES = [
  'Институт компьютерных систем и информационной безопасности',
  'Факультет информационных технологий',
  'Факультет математики и компьютерных наук',
];

const SPECIALIZATIONS = [
  'Прикладная информатика',
  'Информационная безопасность',
  'Программная инженерия',
];

const FIRST_NAMES = ['Александр', 'Мария', 'Дмитрий', 'Елена', 'Иван', 'Анна', 'Сергей', 'Ольга', 'Андрей', 'Наталья'];
const LAST_NAMES = ['Иванов', 'Петрова', 'Сидоров', 'Козлова', 'Новиков', 'Морозова', 'Волков', 'Соколова', 'Попов', 'Лебедева'];
const PATRONYMICS = ['Александрович', 'Дмитриевна', 'Сергеевич', 'Ивановна', 'Андреевич', 'Олеговна', 'Михайлович', 'Петровна', 'Николаевич', 'Алексеевна'];

const COURSE_DATA = [
  { title: 'Математический анализ', code: 'МА-101', type: 'обязательный', credits: 6, year: 1, semester: 1 },
  { title: 'Линейная алгебра', code: 'ЛА-102', type: 'обязательный', credits: 4, year: 1, semester: 1 },
  { title: 'Программирование на Python', code: 'ПР-201', type: 'обязательный', credits: 5, year: 1, semester: 2 },
  { title: 'Базы данных', code: 'БД-301', type: 'обязательный', credits: 5, year: 2, semester: 1 },
  { title: 'Нереляционные базы данных', code: 'НБД-401', type: 'по выбору', credits: 4, year: 2, semester: 2 },
  { title: 'Веб-разработка', code: 'ВР-302', type: 'по выбору', credits: 4, year: 2, semester: 2 },
  { title: 'Алгоритмы и структуры данных', code: 'АСД-202', type: 'обязательный', credits: 5, year: 2, semester: 1 },
  { title: 'Машинное обучение', code: 'МО-501', type: 'факультатив', credits: 3, year: 3, semester: 1 },
];

const PROFESSOR_DATA = [
  { first: 'Алексей', last: 'Петров', patronymic: 'Михайлович', department: 'Кафедра информационных систем', position: 'Доцент' },
  { first: 'Ирина', last: 'Смирнова', patronymic: 'Александровна', department: 'Кафедра математики', position: 'Профессор' },
  { first: 'Владимир', last: 'Козлов', patronymic: 'Николаевич', department: 'Кафедра программирования', position: 'Доцент' },
  { first: 'Татьяна', last: 'Новикова', patronymic: 'Сергеевна', department: 'Кафедра информационной безопасности', position: 'Старший преподаватель' },
];

const MATERIAL_TYPES = ['конспект', 'лабораторная', 'шпаргалка', 'экзамен', 'презентация'] as const;
const DEADLINE_TYPES = ['лабораторная', 'курсовая', 'экзамен', 'зачёт', 'домашнее задание'] as const;
const EVENT_TYPES = ['хакатон', 'конференция', 'спорт', 'мастер-класс'] as const;
const SKILLS = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'SQL', 'Git', 'Docker', 'Математика'];

// ─── Helpers ────────────────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ─── Main Seed ──────────────────────────────────────────────
async function seed() {
  logger.info('=== Starting database seed ===');

  // Connect all databases
  await connectMongo();
  await verifyNeo4j();
  const redis = await getRedis();
  const writeApi = getInfluxWriteApi();

  // Clear existing data
  logger.info('Clearing existing data...');
  const collections = await mongoose.connection.db!.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db!.dropCollection(col.name).catch(() => {});
  }

  // Clear Neo4j
  await runCypherWrite('MATCH (n) DETACH DELETE n');

  // Clear Redis
  await redis.flushdb();

  logger.info('All databases cleared.');

  // ─── 1. Users ─────────────────────────────────────────
  const UserModel = mongoose.model('User');
  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  const users: any[] = [];

  for (let i = 0; i < 10; i++) {
    const user = await UserModel.create({
      email: `student${i + 1}@university.ru`,
      passwordHash,
      role: i === 0 ? 'admin' : i === 1 ? 'moderator' : 'student',
      name: { first: FIRST_NAMES[i], last: LAST_NAMES[i], patronymic: PATRONYMICS[i] },
      university: UNIVERSITIES[i % 2],
      faculty: pick(FACULTIES),
      specialization: pick(SPECIALIZATIONS),
      year: rand(1, 4),
      bio: `Студент ${i + 1}-го курса, увлекаюсь ${pick(SKILLS)} и ${pick(SKILLS)}`,
      skills: [pick(SKILLS), pick(SKILLS), pick(SKILLS)],
      interests: ['Программирование', 'Наука'],
      socialLinks: { telegram: `@student${i + 1}` },
      stats: {
        materialsUploaded: rand(0, 15),
        reviewsWritten: rand(0, 10),
        questionsAsked: rand(0, 8),
        answersAccepted: rand(0, 5),
        reputation: rand(10, 200),
      },
      emailVerified: true,
    });
    users.push(user);

    // Neo4j: create student node
    await runCypherWrite(
      `MERGE (s:Student {id: $id})
       SET s.firstName = $firstName, s.lastName = $lastName,
           s.university = $university, s.faculty = $faculty,
           s.year = $year, s.reputation = $reputation`,
      {
        id: user._id.toString(),
        firstName: user.name.first,
        lastName: user.name.last,
        university: user.university.name,
        faculty: user.faculty,
        year: user.year,
        reputation: user.stats.reputation,
      }
    );

    // Neo4j: add skills
    for (const skill of user.skills) {
      await runCypherWrite(
        `MATCH (s:Student {id: $id})
         MERGE (sk:Skill {name: $skill})
         MERGE (s)-[:HAS_SKILL]->(sk)`,
        { id: user._id.toString(), skill }
      );
    }

    // Redis: leaderboard
    await redis.zadd('leaderboard:reputation', user.stats.reputation, user._id.toString());
  }
  logger.info(`Created ${users.length} users`);

  // ─── 2. Professors ────────────────────────────────────
  const ProfessorModel = mongoose.model('Professor');
  const professors: any[] = [];

  for (const p of PROFESSOR_DATA) {
    const prof = await ProfessorModel.create({
      name: { first: p.first, last: p.last, patronymic: p.patronymic },
      university: UNIVERSITIES[0],
      faculty: pick(FACULTIES),
      department: p.department,
      position: p.position,
      stats: { avgRating: rand(6, 9) + rand(0, 9) / 10, reviewCount: rand(5, 30), courseCount: rand(1, 4) },
    });
    professors.push(prof);

    await runCypherWrite(
      `MERGE (p:Professor {id: $id}) SET p.name = $name, p.faculty = $faculty`,
      { id: prof._id.toString(), name: `${p.first} ${p.last}`, faculty: prof.faculty }
    );
  }
  logger.info(`Created ${professors.length} professors`);

  // ─── 3. Courses ───────────────────────────────────────
  const CourseModel = mongoose.model('Course');
  const courses: any[] = [];

  for (let i = 0; i < COURSE_DATA.length; i++) {
    const cd = COURSE_DATA[i]!;
    const prof = professors[i % professors.length]!;
    const course = await CourseModel.create({
      ...cd,
      description: `Курс "${cd.title}" для студентов ${cd.year}-го курса. Включает лекции, практики и лабораторные работы.`,
      university: UNIVERSITIES[0],
      faculty: pick(FACULTIES),
      professor: { id: prof._id, name: `${prof.name.first} ${prof.name.last}` },
      tags: [cd.code.split('-')[0]!.toLowerCase(), 'программирование'],
      stats: { avgRating: rand(5, 9) + rand(0, 9) / 10, reviewCount: rand(3, 20), avgDifficulty: rand(3, 8), materialCount: rand(2, 15), enrolledCount: rand(10, 50) },
    });
    courses.push(course);

    // Neo4j
    await runCypherWrite(
      `MERGE (c:Course {id: $id}) SET c.title = $title, c.code = $code, c.faculty = $faculty`,
      { id: course._id.toString(), title: cd.title, code: cd.code, faculty: course.faculty }
    );
    await runCypherWrite(
      `MATCH (p:Professor {id: $profId}), (c:Course {id: $courseId}) MERGE (p)-[:TEACHES]->(c)`,
      { profId: prof._id.toString(), courseId: course._id.toString() }
    );
  }

  // Neo4j: enroll students in courses + prerequisites
  for (const user of users) {
    const enrolled = courses.slice(0, rand(3, 6));
    for (const course of enrolled) {
      await runCypherWrite(
        `MATCH (s:Student {id: $sid}), (c:Course {id: $cid}) MERGE (s)-[:ENROLLED_IN {semester: 1, status: 'active'}]->(c)`,
        { sid: user._id.toString(), cid: course._id.toString() }
      );
    }
  }

  // Prerequisites: Нереляционные БД requires Базы данных
  if (courses[4] && courses[3]) {
    await runCypherWrite(
      `MATCH (c1:Course {id: $c1}), (c2:Course {id: $c2}) MERGE (c1)-[:REQUIRES]->(c2)`,
      { c1: courses[4]._id.toString(), c2: courses[3]._id.toString() }
    );
  }

  // Prerequisites: Алгоритмы requires Программирование
  if (courses[6] && courses[2]) {
    await runCypherWrite(
      `MATCH (c1:Course {id: $c1}), (c2:Course {id: $c2}) MERGE (c1)-[:REQUIRES]->(c2)`,
      { c1: courses[6]._id.toString(), c2: courses[2]._id.toString() }
    );
  }

  logger.info(`Created ${courses.length} courses with enrollment + prerequisites`);

  // ─── 4. Neo4j Friendships ─────────────────────────────
  for (let i = 0; i < users.length - 1; i += 2) {
    await runCypherWrite(
      `MATCH (a:Student {id: $a}), (b:Student {id: $b}) MERGE (a)-[:FRIENDS_WITH]-(b)`,
      { a: users[i]!._id.toString(), b: users[i + 1]!._id.toString() }
    );
  }
  // Extra friendships for richer graph
  await runCypherWrite(
    `MATCH (a:Student {id: $a}), (b:Student {id: $b}) MERGE (a)-[:FRIENDS_WITH]-(b)`,
    { a: users[0]!._id.toString(), b: users[4]!._id.toString() }
  );
  await runCypherWrite(
    `MATCH (a:Student {id: $a}), (b:Student {id: $b}) MERGE (a)-[:FRIENDS_WITH]-(b)`,
    { a: users[2]!._id.toString(), b: users[7]!._id.toString() }
  );
  logger.info('Created friendships');

  // ─── 5. Materials ─────────────────────────────────────
  const MaterialModel = mongoose.model('Material');
  for (let i = 0; i < 20; i++) {
    const author = pick(users);
    const course = pick(courses);
    await MaterialModel.create({
      title: `${pick(MATERIAL_TYPES)} по ${course.title} (#${i + 1})`,
      course: { id: course._id, title: course.title, code: course.code },
      type: pick(MATERIAL_TYPES),
      description: `Учебный материал по курсу "${course.title}". Содержит подробные пояснения и примеры.`,
      author: { id: author._id, name: `${author.name.first} ${author.name.last}` },
      files: [{ filename: `file-${crypto.randomUUID()}.pdf`, originalName: `material_${i + 1}.pdf`, mimeType: 'application/pdf', size: rand(50000, 5000000), url: `/uploads/materials/demo-${i}.pdf` }],
      tags: ['учёба', course.code.split('-')[0]!.toLowerCase()],
      stats: { views: rand(10, 500), downloads: rand(5, 200), likes: rand(0, 50), commentCount: rand(0, 10) },
      likedBy: [],
    });
  }
  logger.info('Created 20 materials');

  // ─── 6. Reviews ───────────────────────────────────────
  const ReviewModel = mongoose.model('Review');
  for (let i = 0; i < 15; i++) {
    const author = users[i % users.length]!;
    const course = courses[i % courses.length]!;
    await ReviewModel.create({
      target: { type: 'course', id: course._id, name: course.title },
      author: { id: author._id, name: `${author.name.first} ${author.name.last}` },
      anonymous: Math.random() > 0.7,
      ratings: { overall: rand(4, 10), difficulty: rand(3, 9), usefulness: rand(5, 10) },
      text: `Отличный курс! Преподаватель объясняет очень понятно. Рекомендую всем студентам ${course.year}-го курса.`,
      semester: '2025-2',
      likes: rand(0, 20),
      likedBy: [],
    });
  }
  logger.info('Created 15 reviews');

  // ─── 7. Forum Questions & Answers ─────────────────────
  const QuestionModel = mongoose.model('Question');
  const AnswerModel = mongoose.model('Answer');
  for (let i = 0; i < 10; i++) {
    const author = pick(users);
    const course = pick(courses);
    const q = await QuestionModel.create({
      title: `Как решить задачу ${i + 1} по ${course.title}?`,
      body: `Не могу разобраться с заданием ${i + 1}. Подскажите, пожалуйста, как подойти к решению?`,
      course: { id: course._id, title: course.title },
      author: { id: author._id, name: `${author.name.first} ${author.name.last}` },
      tags: [course.code.split('-')[0]!.toLowerCase(), 'помощь'],
      views: rand(5, 100),
      answerCount: 0,
      votes: rand(0, 15),
      status: Math.random() > 0.5 ? 'resolved' : 'open',
      hasAcceptedAnswer: false,
    });

    // Add 1-3 answers per question
    const answerCount = rand(1, 3);
    for (let j = 0; j < answerCount; j++) {
      const answerer = pick(users);
      await AnswerModel.create({
        questionId: q._id,
        author: { id: answerer._id, name: `${answerer.name.first} ${answerer.name.last}` },
        body: `Попробуйте начать с ${pick(['определения', 'формулы', 'разбора примера', 'чтения конспекта'])}. Вот подробное решение...`,
        votes: rand(0, 10),
        isAccepted: false,
        votedBy: [],
      });
    }
    await QuestionModel.updateOne({ _id: q._id }, { $set: { answerCount } });
  }
  logger.info('Created 10 questions with answers');

  // ─── 8. Groups ────────────────────────────────────────
  const GroupModel = mongoose.model('Group');
  for (let i = 0; i < 5; i++) {
    const leader = users[i]!;
    const course = courses[i % courses.length]!;
    await GroupModel.create({
      name: `Группа подготовки к ${course.title}`,
      course: { id: course._id, title: course.title },
      type: pick(['study', 'project', 'exam_prep']),
      description: `Совместная подготовка к ${pick(['экзамену', 'лабораторной', 'проекту'])} по ${course.title}`,
      members: [
        { userId: leader._id, name: `${leader.name.first} ${leader.name.last}`, role: 'leader', joinedAt: new Date() },
        { userId: users[(i + 1) % users.length]!._id, name: `${users[(i + 1) % users.length]!.name.first} ${users[(i + 1) % users.length]!.name.last}`, role: 'member', joinedAt: new Date() },
      ],
      maxMembers: 5,
      status: 'open',
    });
  }
  logger.info('Created 5 groups');

  // ─── 9. Deadlines ─────────────────────────────────────
  const DeadlineModel = mongoose.model('Deadline');
  for (let i = 0; i < 12; i++) {
    const course = courses[i % courses.length]!;
    const creator = pick(users);
    await DeadlineModel.create({
      course: { id: course._id, title: course.title, code: course.code },
      title: `${pick(DEADLINE_TYPES)} №${i + 1} по ${course.title}`,
      type: pick(DEADLINE_TYPES),
      description: `Сдать до указанной даты. Максимальный балл: ${rand(5, 20)}.`,
      dueDate: futureDate(rand(1, 30)),
      createdBy: { id: creator._id, name: `${creator.name.first} ${creator.name.last}` },
      confirmations: rand(0, 8),
      confirmedBy: [creator._id],
    });
  }
  logger.info('Created 12 deadlines');

  // ─── 10. Marketplace Listings ─────────────────────────
  const ListingModel = mongoose.model('Listing');
  for (let i = 0; i < 8; i++) {
    const seller = pick(users);
    await ListingModel.create({
      title: `${pick(['Математический анализ, Зорич', 'Линейная алгебра, Кострикин', 'Python Cookbook', 'Алгоритмы, Кормен'])} ${pick(['том 1', 'том 2', '4-е издание', ''])}`.trim(),
      type: pick(['sell', 'buy', 'exchange', 'free']),
      price: rand(100, 2000),
      condition: pick(['отличное', 'хорошее', 'нормальное']),
      description: 'Учебник в хорошем состоянии. Без пометок.',
      seller: { id: seller._id, name: `${seller.name.first} ${seller.name.last}`, university: seller.university.name },
      location: 'Главный корпус, 3 этаж',
      status: 'active',
      photos: [],
    });
  }
  logger.info('Created 8 marketplace listings');

  // ─── 11. Events ───────────────────────────────────────
  const EventModel = mongoose.model('Event');
  for (let i = 0; i < 6; i++) {
    const organizer = pick(users);
    const event = await EventModel.create({
      title: `${pick(EVENT_TYPES)}: ${pick(['CodeFest 2026', 'Олимпиада по математике', 'День открытых дверей', 'Хакатон по ИИ', 'Спортивный турнир', 'Мастер-класс по Git'])}`,
      type: pick(EVENT_TYPES),
      description: 'Приглашаем всех студентов! Будет интересно и полезно.',
      organizer: { id: organizer._id, name: `${organizer.name.first} ${organizer.name.last}` },
      university: UNIVERSITIES[0],
      location: pick(['Главный корпус, аудитория 301', 'Спортивный комплекс', 'Онлайн (Zoom)', 'Конференц-зал']),
      date: futureDate(rand(3, 60)),
      time: `${rand(9, 18)}:00`,
      maxParticipants: rand(20, 200),
      attendeeCount: rand(5, 50),
      attendees: users.slice(0, rand(2, 6)).map((u: any) => u._id),
      tags: ['студенты', pick(['программирование', 'наука', 'спорт', 'карьера'])],
      status: 'upcoming',
    });

    // Neo4j: event node + attendance
    await runCypherWrite(
      `MERGE (e:Event {id: $id}) SET e.title = $title`,
      { id: event._id.toString(), title: event.title }
    );
    for (const attendee of event.attendees) {
      await runCypherWrite(
        `MATCH (s:Student {id: $sid}), (e:Event {id: $eid}) MERGE (s)-[:ATTENDING]->(e)`,
        { sid: attendee.toString(), eid: event._id.toString() }
      );
    }
  }
  logger.info('Created 6 events with Neo4j attendance');

  // ─── 12. Notifications ────────────────────────────────
  const NotificationModel = mongoose.model('Notification');
  for (const user of users.slice(0, 5)) {
    for (let i = 0; i < 3; i++) {
      await NotificationModel.create({
        userId: user._id,
        type: pick(['MATERIAL_NEW', 'DEADLINE_REMINDER', 'NEW_ANSWER', 'FRIEND_REQUEST']),
        title: pick(['Новый материал', 'Приближается дедлайн', 'Ответ на ваш вопрос', 'Заявка в друзья']),
        message: 'Проверьте обновления на платформе.',
        read: Math.random() > 0.5,
      });
    }
  }
  logger.info('Created notifications');

  // ─── 13. InfluxDB Activity Data (30 days) ─────────────
  const actions = ['login', 'material_view', 'material_download', 'review_create', 'forum_question', 'course_enroll'];
  for (let day = 0; day < 30; day++) {
    const timestamp = pastDate(day);
    const actionsPerDay = rand(5, 20);
    for (let j = 0; j < actionsPerDay; j++) {
      const user = pick(users);
      const point = new Point('user_activity')
        .tag('university', user.university.name)
        .tag('faculty', user.faculty)
        .tag('action', pick(actions))
        .stringField('userId', user._id.toString())
        .intField('count', 1)
        .timestamp(timestamp);
      writeApi.writePoint(point);
    }
  }

  // Search query tracking
  const searches = ['python', 'математический анализ', 'лабораторная', 'экзамен', 'курсовая'];
  for (let i = 0; i < 50; i++) {
    const point = new Point('search_queries')
      .tag('type', pick(['course', 'material', 'forum']))
      .stringField('query', pick(searches))
      .intField('resultCount', rand(1, 30))
      .timestamp(pastDate(rand(0, 30)));
    writeApi.writePoint(point);
  }

  logger.info('Wrote 30 days of InfluxDB activity data');

  // ─── Flush & Close ────────────────────────────────────
  await writeApi.flush();
  await disconnectMongo();
  await closeNeo4j();
  await closeInflux();
  await closeRedis();

  logger.info('=== Seed complete! ===');
  logger.info(`Demo login: student1@university.ru / ${PASSWORD} (admin)`);
  logger.info(`Demo login: student2@university.ru / ${PASSWORD} (moderator)`);
  logger.info(`Demo login: student3@university.ru / ${PASSWORD} (student)`);
  process.exit(0);
}

seed().catch((err) => {
  logger.error(err, 'Seed failed');
  process.exit(1);
});
