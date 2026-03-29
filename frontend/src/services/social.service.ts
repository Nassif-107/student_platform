import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'
import type { User } from './auth.service'
import { mapUser } from './auth.service'

export interface UserProfile extends User {
  friendCount: number
  materialCount: number
  reviewCount: number
  questionCount: number
  answerCount: number
  reputation: number
  skills: string[]
  interests: string[]
  socialLinks: {
    telegram?: string
    vk?: string
    github?: string
    phone?: string
  }
  settings?: {
    notifications?: {
      deadlines?: boolean
      materials?: boolean
      friends?: boolean
      forum?: boolean
    }
    privacy?: {
      showEmail?: boolean
      showPhone?: boolean
      allowMessages?: 'all' | 'friends' | 'none'
    }
  }
  mutualFriends?: number
  isFriend?: boolean
  friendRequestSent?: boolean
  friendRequestReceived?: boolean
}

export interface FriendRequest {
  id: string
  fromUserId: string
  fromUserName: string
  fromUserAvatarUrl?: string
  faculty?: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  university?: string
  faculty?: string
  course?: number
  bio?: string
  skills?: string[]
  interests?: string[]
  socialLinks?: {
    telegram?: string
    vk?: string
    github?: string
  }
  settings?: {
    notifications?: {
      deadlines?: boolean
      materials?: boolean
      friends?: boolean
      forum?: boolean
    }
    privacy?: {
      showEmail?: boolean
      showPhone?: boolean
      allowMessages?: 'all' | 'friends' | 'none'
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFriendNode(raw: any): UserProfile {
  return {
    id: raw.id ?? '',
    email: '',
    firstName: raw.firstName ?? raw.name?.first ?? '',
    lastName: raw.lastName ?? raw.name?.last ?? '',
    avatarUrl: raw.avatar ?? raw.avatarUrl,
    faculty: raw.faculty,
    university: raw.university,
    role: 'student',
    createdAt: '',
    friendCount: 0,
    materialCount: 0,
    reviewCount: 0,
    questionCount: 0,
    answerCount: 0,
    reputation: 0,
    skills: [],
    interests: [],
    socialLinks: {},
    mutualFriends: raw.mutualCount ?? 0,
  }
}

function mapFriendRequestNode(raw: any): FriendRequest {
  const firstName = raw.firstName ?? ''
  const lastName = raw.lastName ?? ''
  return {
    id: raw.id ?? '',
    fromUserId: raw.id ?? '',
    fromUserName: `${firstName} ${lastName}`.trim(),
    fromUserAvatarUrl: raw.avatar ?? raw.avatarUrl,
    faculty: raw.faculty,
    status: 'pending',
    createdAt: raw.requestedAt ?? raw.createdAt ?? '',
  }
}

function mapUserProfile(raw: any): UserProfile {
  const base = mapUser(raw)
  return {
    ...base,
    friendCount: raw.friendCount ?? raw.stats?.friendCount ?? 0,
    materialCount: raw.materialCount ?? raw.stats?.materialsUploaded ?? 0,
    reviewCount: raw.reviewCount ?? raw.stats?.reviewsWritten ?? 0,
    questionCount: raw.questionCount ?? raw.stats?.questionsAsked ?? 0,
    answerCount: raw.answerCount ?? raw.stats?.answersAccepted ?? 0,
    reputation: raw.reputation ?? raw.stats?.reputation ?? 0,
    skills: raw.skills ?? [],
    interests: raw.interests ?? [],
    socialLinks: raw.socialLinks ?? raw.contacts ?? {},
    settings: raw.settings,
    isFriend: raw.isFriend,
    friendRequestSent: raw.friendRequestSent,
    friendRequestReceived: raw.friendRequestReceived,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const socialService = {
  getProfile: async (id: string) => {
    const raw = await api.get<any>(`/users/${id}`)
    return mapUserProfile(raw)
  },

  updateProfile: async (data: UpdateProfileData) => {
    const raw = await api.patch<any>('/users/me', data)
    return mapUserProfile(raw)
  },

  updateAvatar: (formData: FormData) =>
    api.post<{ avatarUrl: string }>('/users/me/avatar', formData),

  getFriends: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<UserProfile>> => {
    const raw = await api.get<unknown>(`/social/friends${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapFriendNode)
  },

  sendFriendRequest: (userId: string) =>
    api.post<{ sent: boolean }>(`/social/friends/${userId}`),

  acceptFriendRequest: (senderId: string) =>
    api.post<{ accepted: boolean }>(`/social/requests/${senderId}/accept`),

  rejectFriendRequest: (senderId: string) =>
    api.post<{ rejected: boolean }>(`/social/requests/${senderId}/reject`),

  removeFriend: (userId: string) =>
    api.del<{ removed: boolean }>(`/social/friends/${userId}`),

  getFriendRequests: async (): Promise<FriendRequest[]> => {
    const raw = await api.get<any>('/social/requests')
    const arr = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? [])
    return arr.map(mapFriendRequestNode)
  },

  searchUsers: async (query: string, page?: number, limit?: number): Promise<PaginatedResponse<UserProfile>> => {
    const raw = await api.get<unknown>(`/users/search${buildQueryString({ q: query, page, limit })}`)
    return mapPaginatedResponse(raw, mapUserProfile)
  },

  getFriendSuggestions: async () => {
    const raw = await api.get<any[]>('/social/suggestions')
    return (raw ?? []).map(mapFriendNode)
  },

  getClassmates: async () => {
    const raw = await api.get<any[]>('/social/classmates')
    return (raw ?? []).map(mapFriendNode)
  },
}
