import type { FilterQuery } from 'mongoose';
import { GroupModel, type GroupDocument } from './groups.model.js';
import { findTeammates, addMemberToGroup, removeMemberFromGroup } from './groups.graph.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { getCache, setCache, buildCacheKey, deleteCachePattern } from '../../utils/cache.js';

const CACHE_TTL = 300; // 5 minutes

interface AuthorInfo {
  id: string;
  name: string;
}

interface GroupQuery {
  courseId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ---------- List Groups ----------

export async function getGroups(query: GroupQuery) {
  const cacheKey = buildCacheKey('group', 'list', query as Record<string, unknown>);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const { courseId, type, status, page = 1, limit = 20 } = query;
  const filter: FilterQuery<GroupDocument> = {};

  if (courseId) filter['course.id'] = courseId;
  if (type) filter.type = type;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [groups, total] = await Promise.all([
    GroupModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    GroupModel.countDocuments(filter),
  ]);

  const result = { groups, total, page, limit };
  await setCache(cacheKey, result, CACHE_TTL);
  return result;
}

// ---------- Get Group by ID ----------

export async function getGroupById(id: string) {
  const cacheKey = buildCacheKey('group', id);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const group = await GroupModel.findById(id).lean();
  if (!group) return null;

  await setCache(cacheKey, group, CACHE_TTL);
  return group;
}

// ---------- Create Group ----------

export async function createGroup(
  data: {
    name: string;
    courseId: string;
    courseTitle: string;
    type: 'study' | 'project' | 'exam_prep';
    description?: string;
    maxMembers?: number;
  },
  user: AuthorInfo
) {
  const group = await GroupModel.create({
    name: data.name,
    course: { id: data.courseId, title: data.courseTitle },
    type: data.type,
    description: data.description,
    maxMembers: data.maxMembers ?? 5,
    members: [{ userId: user.id, name: user.name, role: 'leader' }],
  });

  await addMemberToGroup(user.id, group._id.toString());

  await deleteCachePattern('app:cache:group:*');

  trackActivity('user_activity', { action: 'group_create' }, { userId: user.id, groupId: group._id.toString() });

  return group.toObject();
}

// ---------- Join Group ----------

export async function joinGroup(groupId: string, user: AuthorInfo) {
  const group = await GroupModel.findById(groupId);
  if (!group) return { error: 'GROUP_NOT_FOUND' as const };
  if (group.status === 'full') return { error: 'GROUP_FULL' as const };
  if (group.status === 'closed') return { error: 'GROUP_CLOSED' as const };

  const alreadyMember = group.members.some((m) => m.userId.toString() === user.id);
  if (alreadyMember) return { error: 'ALREADY_MEMBER' as const };

  group.members.push({
    userId: user.id as unknown as GroupDocument['members'][0]['userId'],
    name: user.name,
    role: 'member',
    joinedAt: new Date(),
  });

  if (group.members.length >= group.maxMembers) {
    group.status = 'full';
  }

  await group.save();
  await addMemberToGroup(user.id, groupId);

  await deleteCachePattern('app:cache:group:*');

  trackActivity('user_activity', { action: 'group_join' }, { userId: user.id, groupId });

  return { success: true, group: group.toObject() };
}

// ---------- Leave Group ----------

export async function leaveGroup(groupId: string, userId: string) {
  const group = await GroupModel.findById(groupId);
  if (!group) return { error: 'GROUP_NOT_FOUND' as const };

  const memberIdx = group.members.findIndex((m) => m.userId.toString() === userId);
  if (memberIdx === -1) return { error: 'NOT_A_MEMBER' as const };

  const leavingMember = group.members[memberIdx]!;
  group.members.splice(memberIdx, 1);

  if (group.members.length === 0) {
    group.status = 'closed';
  } else if (leavingMember.role === 'leader') {
    group.members[0]!.role = 'leader';
  }

  if (group.status === 'full' && group.members.length < group.maxMembers) {
    group.status = 'open';
  }

  await group.save();
  await removeMemberFromGroup(userId, groupId);

  await deleteCachePattern('app:cache:group:*');

  trackActivity('user_activity', { action: 'group_leave' }, { userId, groupId });

  return { success: true };
}

// ---------- Update Group ----------

export async function updateGroup(
  groupId: string,
  userId: string,
  data: { name?: string; description?: string; maxMembers?: number; status?: 'open' | 'closed' }
) {
  const group = await GroupModel.findById(groupId);
  if (!group) return { error: 'GROUP_NOT_FOUND' as const };

  const isLeader = group.members.some(
    (m) => m.userId.toString() === userId && m.role === 'leader'
  );
  if (!isLeader) return { error: 'NOT_LEADER' as const };

  if (data.name !== undefined) group.name = data.name;
  if (data.description !== undefined) group.description = data.description;
  if (data.maxMembers !== undefined) group.maxMembers = data.maxMembers;
  if (data.status !== undefined) group.status = data.status;

  await group.save();

  await deleteCachePattern('app:cache:group:*');

  return { success: true, group: group.toObject() };
}

// ---------- Delete Group ----------

export async function deleteGroup(groupId: string, userId: string, userRole?: string) {
  const group = await GroupModel.findById(groupId).lean();
  if (!group) return { error: 'GROUP_NOT_FOUND' as const };

  const isLeader = group.members.some(
    (m) => m.userId.toString() === userId && m.role === 'leader'
  );
  const isModerator = userRole === 'moderator' || userRole === 'admin';

  if (!isLeader && !isModerator) return { error: 'NOT_LEADER' as const };

  for (const member of group.members) {
    await removeMemberFromGroup(member.userId.toString(), groupId);
  }

  await GroupModel.deleteOne({ _id: groupId });

  await deleteCachePattern('app:cache:group:*');

  return { success: true };
}

// ---------- Team Suggestions ----------

export async function getTeamSuggestions(userId: string, courseId: string, skills: string[] = []) {
  return findTeammates(userId, courseId, skills);
}
