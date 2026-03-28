import * as socialGraph from './social.graph.js';
import { createNotification } from '../notifications/notifications.service.js';

// ---------- Get Friends ----------

export async function getFriends(userId: string) {
  return socialGraph.queryFriends(userId);
}

// ---------- Send Friend Request ----------

export async function addFriend(userId: string, friendId: string) {
  if (userId === friendId) return { error: 'CANNOT_FRIEND_SELF' as const };

  const sent = await socialGraph.sendFriendRequest(userId, friendId);
  if (!sent) return { error: 'ALREADY_FRIENDS_OR_REQUESTED' as const };

  await createNotification(
    friendId,
    'FRIEND_REQUEST',
    'Новая заявка в друзья',
    'Вам отправлена заявка в друзья',
    '/friends?tab=requests',
  );

  return { success: true };
}

// ---------- Remove Friend ----------

export async function removeFriend(userId: string, friendId: string) {
  await socialGraph.deleteFriendship(userId, friendId);
  return { success: true };
}

// ---------- Friend Suggestions ----------

export async function getSuggestions(userId: string) {
  return socialGraph.querySuggestions(userId);
}

// ---------- Classmates ----------

export async function getClassmates(userId: string) {
  return socialGraph.queryClassmates(userId);
}

// ---------- Friend Requests ----------

export async function getPendingRequests(userId: string) {
  return socialGraph.queryPendingRequests(userId);
}

export async function acceptRequest(userId: string, senderId: string) {
  const accepted = await socialGraph.acceptFriendRequest(userId, senderId);
  if (!accepted) return { error: 'REQUEST_NOT_FOUND' as const };

  await createNotification(
    senderId,
    'FRIEND_ACTIVITY',
    'Заявка принята',
    'Ваша заявка в друзья была принята',
    '/friends',
  );

  return { success: true };
}

export async function rejectRequest(userId: string, senderId: string) {
  const rejected = await socialGraph.rejectFriendRequest(userId, senderId);
  if (!rejected) return { error: 'REQUEST_NOT_FOUND' as const };
  return { success: true };
}
