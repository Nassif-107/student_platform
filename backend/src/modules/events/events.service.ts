import { type FilterQuery } from 'mongoose';
import { EventModel, type EventDocument } from './events.model.js';
import { ServiceError } from '../../utils/service-error.js';
import {
  createEventNode,
  addAttendance,
  removeAttendance,
  getAttendingFriends as graphGetAttendingFriends,
} from './events.graph.js';
import { getCache, setCache, deleteCache, buildCacheKey, deleteCachePattern } from '../../utils/cache.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { UserModel } from '../users/users.model.js';

interface EventsQuery {
  universityId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface CreateEventData {
  title: string;
  type: string;
  description: string;
  university?: { id?: string; name?: string };
  location?: string;
  date: string;
  time?: string;
  maxParticipants?: number;
  tags?: string[];
  coverPhoto?: string;
}

const CACHE_TTL = 300; // 5 minutes

export async function getEvents(query: EventsQuery) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  const cacheKey = buildCacheKey('events', 'list', query as Record<string, unknown>);
  const cached = await getCache<{ items: unknown[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;

  const filter: FilterQuery<EventDocument> = {};

  if (query.universityId) {
    filter['university.id'] = query.universityId;
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = new Date(query.from);
    if (query.to) filter.date.$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    EventModel.find(filter).sort({ date: 1 }).skip(skip).limit(limit).lean(),
    EventModel.countDocuments(filter),
  ]);

  const result = { items, total, page, limit };
  await setCache(cacheKey, result, CACHE_TTL);

  return result;
}

export async function createEvent(data: CreateEventData, organizerId: string, organizerName: string) {
  const event = await EventModel.create({
    ...data,
    date: new Date(data.date),
    organizer: { id: organizerId, name: organizerName },
  });

  await createEventNode({
    id: event._id.toString(),
    title: event.title,
    type: event.type,
    date: event.date.toISOString(),
  });

  await deleteCachePattern('app:cache:events:*');

  trackActivity(
    'user_activity',
    { action: 'event_created', university: data.university?.name ?? 'unknown' },
    { userId: organizerId, eventId: event._id.toString(), count: 1 }
  );

  return event.toObject();
}

export async function toggleAttendance(eventId: string, userId: string) {
  const event = await EventModel.findById(eventId).lean();
  if (!event) {
    throw new ServiceError('Мероприятие не найдено', 'NOT_FOUND');
  }

  const alreadyAttending = event.attendees.some(
    (id) => id.toString() === userId
  );

  if (alreadyAttending) {
    await EventModel.findByIdAndUpdate(eventId, {
      $pull: { attendees: userId },
      $inc: { attendeeCount: -1 },
    });
    await removeAttendance(userId, eventId);

    await deleteCache(buildCacheKey('events', eventId));

    trackActivity(
      'user_activity',
      { action: 'event_unattend', university: event.university?.name ?? 'unknown' },
      { userId, eventId, count: 1 }
    );

    return { attending: false, attendeeCount: event.attendeeCount - 1 };
  }

  if (event.maxParticipants && event.attendeeCount >= event.maxParticipants) {
    throw new ServiceError('Мероприятие уже заполнено', 'BAD_REQUEST');
  }

  await EventModel.findByIdAndUpdate(eventId, {
    $addToSet: { attendees: userId },
    $inc: { attendeeCount: 1 },
  });
  await addAttendance(userId, eventId);

  await deleteCache(buildCacheKey('events', eventId));

  trackActivity(
    'user_activity',
    { action: 'event_attend', university: event.university?.name ?? 'unknown' },
    { userId, eventId, count: 1 }
  );

  return { attending: true, attendeeCount: event.attendeeCount + 1 };
}

export async function getAttendingFriends(eventId: string, userId: string) {
  return graphGetAttendingFriends(eventId, userId);
}

// ---------- Get Event by ID ----------

export async function getEventById(eventId: string) {
  const cacheKey = buildCacheKey('events', eventId);
  const cached = await getCache<EventDocument>(cacheKey);
  if (cached) return cached;

  const event = await EventModel.findById(eventId).lean();
  if (!event) return null;

  await setCache(cacheKey, event, CACHE_TTL);
  return event;
}

// ---------- Update Event ----------

export async function updateEvent(
  eventId: string,
  organizerId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    date?: string;
    time?: string;
    maxParticipants?: number;
    tags?: string[];
    coverPhoto?: string;
  }
) {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw new ServiceError('Мероприятие не найдено', 'NOT_FOUND');
  }

  if (event.organizer?.id?.toString() !== organizerId) {
    throw new ServiceError('Только организатор может редактировать мероприятие', 'FORBIDDEN');
  }

  if (data.title !== undefined) event.title = data.title;
  if (data.description !== undefined) event.description = data.description;
  if (data.location !== undefined) event.location = data.location;
  if (data.date !== undefined) event.date = new Date(data.date);
  if (data.time !== undefined) event.time = data.time;
  if (data.maxParticipants !== undefined) event.maxParticipants = data.maxParticipants;
  if (data.tags !== undefined) event.tags = data.tags;
  if (data.coverPhoto !== undefined) event.coverPhoto = data.coverPhoto;

  await event.save();

  await deleteCache(buildCacheKey('events', eventId));
  await deleteCachePattern('app:cache:events:*');

  return event.toObject();
}

// ---------- Delete Event ----------

export async function deleteEvent(eventId: string, userId: string, isModerator = false) {
  const event = await EventModel.findById(eventId).lean();
  if (!event) {
    throw new ServiceError('Мероприятие не найдено', 'NOT_FOUND');
  }

  const isOrganizer = event.organizer?.id?.toString() === userId;
  if (!isOrganizer && !isModerator) {
    throw new ServiceError('Недостаточно прав для удаления мероприятия', 'FORBIDDEN');
  }

  await EventModel.findByIdAndDelete(eventId);

  await deleteCache(buildCacheKey('events', eventId));
  await deleteCachePattern('app:cache:events:*');

  trackActivity(
    'user_activity',
    { action: 'event_deleted', university: event.university?.name ?? 'unknown' },
    { userId, eventId, count: 1 }
  );
}

// ---------- Get Event Participants ----------

export async function getEventParticipants(eventId: string, page: number, limit: number) {
  const event = await EventModel.findById(eventId).lean();
  if (!event) {
    throw new ServiceError('Мероприятие не найдено', 'NOT_FOUND');
  }

  // UserModel is imported at the top of the file

  const total = event.attendees.length;
  const skip = (page - 1) * limit;
  const attendeeIds = event.attendees.slice(skip, skip + limit);

  const participants = await UserModel.find({ _id: { $in: attendeeIds } })
    .select('name avatar university')
    .lean();

  return { items: participants, total, page, limit };
}
