import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Group {
  id: string
  name: string
  description: string
  type: string
  courseId?: string
  courseName?: string
  leaderId: string
  leaderName: string
  maxMembers: number
  currentMembers: number
  members: GroupMember[]
  isOpen: boolean
  createdAt: string
}

export interface GroupMember {
  id: string
  userId: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: 'leader' | 'member'
  joinedAt: string
}

export interface GroupsParams {
  page?: number
  limit?: number
  search?: string
  courseId?: string
  isOpen?: boolean
  hasSpace?: boolean
  sortBy?: 'createdAt' | 'currentMembers'
  sortOrder?: 'asc' | 'desc'
}

export type GroupType = 'study' | 'project' | 'exam_prep'

export interface CreateGroupData {
  name: string
  courseId: string
  courseTitle: string
  type: GroupType
  description?: string
  maxMembers?: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapGroupMember(raw: any): GroupMember {
  return {
    id: raw.id ?? '',
    userId: raw.userId ?? raw.id ?? '',
    firstName: raw.firstName ?? (typeof raw.name === 'string' ? raw.name.split(' ')[0] : '') ?? '',
    lastName: raw.lastName ?? (typeof raw.name === 'string' ? raw.name.split(' ').slice(1).join(' ') : '') ?? '',
    avatarUrl: raw.avatar ?? raw.avatarUrl,
    role: raw.role ?? 'member',
    joinedAt: raw.joinedAt ?? raw.createdAt ?? '',
  }
}

function mapGroup(raw: any): Group {
  if (!raw) return raw
  const members = (raw.members ?? []).map(mapGroupMember)
  const leader = members.find((m: GroupMember) => m.role === 'leader')
  return {
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? '',
    type: raw.type ?? 'study',
    courseId: raw.course?.id ?? raw.courseId,
    courseName: raw.course?.title ?? raw.courseName,
    leaderId: leader?.userId ?? raw.leaderId ?? '',
    leaderName: leader ? `${leader.firstName} ${leader.lastName}`.trim() : (raw.leaderName ?? ''),
    maxMembers: raw.maxMembers ?? 5,
    currentMembers: members.length || raw.currentMembers || 0,
    members,
    isOpen: raw.status === 'open' || raw.isOpen === true,
    createdAt: raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const groupsService = {
  getGroups: async (params?: GroupsParams): Promise<PaginatedResponse<Group>> => {
    const raw = await api.get<unknown>(`/groups${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapGroup)
  },

  getGroupById: async (id: string) => {
    const raw = await api.get<any>(`/groups/${id}`)
    return mapGroup(raw)
  },

  createGroup: async (data: CreateGroupData) => {
    const raw = await api.post<any>('/groups', data)
    return mapGroup(raw)
  },

  updateGroup: async (id: string, data: Partial<CreateGroupData>) => {
    const raw = await api.patch<any>(`/groups/${id}`, data)
    return mapGroup(raw)
  },

  deleteGroup: (id: string) =>
    api.del<{ message: string }>(`/groups/${id}`),

  joinGroup: (id: string) =>
    api.post<{ message: string }>(`/groups/${id}/join`),

  leaveGroup: (id: string) =>
    api.del<{ message: string }>(`/groups/${id}/leave`),

  findTeammates: async (params?: {
    courseId?: string
    skills?: string[]
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<GroupMember>> => {
    const raw = await api.get<unknown>(`/groups/suggestions${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapGroupMember)
  },

  getChatMessages: async (groupId: string, limit = 50): Promise<Array<{
    id: string
    userId: string
    userName: string
    text: string
    timestamp: string
    isMine: boolean
  }>> => {
    const raw = await api.get<any>(`/groups/${groupId}/messages?limit=${limit}`)
    return Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? [])
  },
}
