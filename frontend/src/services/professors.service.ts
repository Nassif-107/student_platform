import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Professor {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  department: string
  university: string
  faculty: string
  position: string
  avatarUrl?: string
  email?: string
  averageRating: number
  reviewCount: number
  courseCount: number
}

interface ProfessorsParams {
  universityId?: string
  faculty?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ProfessorReview {
  id: string
  authorName?: string
  courseName: string
  rating: number
  text: string
  likeCount: number
  isLiked?: boolean
  createdAt: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProfessor(raw: any): Professor {
  if (!raw) return raw
  return {
    id: raw.id,
    firstName: raw.name?.first ?? raw.firstName ?? '',
    lastName: raw.name?.last ?? raw.lastName ?? '',
    middleName: raw.name?.patronymic ?? raw.middleName,
    department: raw.department ?? '',
    university: raw.university?.name ?? raw.university ?? '',
    faculty: raw.faculty ?? '',
    position: raw.position ?? '',
    avatarUrl: raw.avatar ?? raw.avatarUrl,
    email: raw.email,
    averageRating: raw.stats?.avgRating ?? raw.averageRating ?? 0,
    reviewCount: raw.stats?.reviewCount ?? raw.reviewCount ?? 0,
    courseCount: raw.stats?.courseCount ?? raw.courseCount ?? 0,
  }
}

function mapProfessorReview(raw: any): ProfessorReview {
  return {
    id: raw.id,
    authorName: raw.anonymous ? undefined : (raw.author?.name ?? raw.authorName),
    courseName: raw.target?.name ?? raw.courseName ?? '',
    rating: raw.ratings?.overall ?? raw.rating ?? 0,
    text: raw.text ?? '',
    likeCount: raw.likes ?? raw.likeCount ?? 0,
    isLiked: raw.isLiked,
    createdAt: raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const professorsService = {
  getProfessors: async (params?: ProfessorsParams): Promise<PaginatedResponse<Professor>> => {
    const raw = await api.get<unknown>(`/professors${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapProfessor)
  },

  getProfessorById: async (id: string) => {
    const raw = await api.get<any>(`/professors/${id}`)
    return mapProfessor(raw)
  },

  getProfessorReviews: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ProfessorReview>> => {
    const raw = await api.get<unknown>(`/professors/${id}/reviews${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapProfessorReview)
  },
}
