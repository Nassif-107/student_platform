import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Review {
  id: string
  targetType: 'course' | 'professor'
  targetId: string
  targetName: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  rating: number
  difficulty: number
  usefulness: number
  semester: string
  text: string
  isAnonymous: boolean
  likeCount: number
  isLiked?: boolean
  createdAt: string
}

export interface ReviewsParams {
  page?: number
  limit?: number
  professorId?: string
  courseId?: string
  authorId?: string
  sortBy?: 'createdAt' | 'rating' | 'likeCount'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateReviewData {
  targetType: 'course' | 'professor'
  targetId: string
  rating: number
  difficulty: number
  usefulness: number
  text: string
  semester: string
  isAnonymous: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapReview(raw: any): Review {
  if (!raw) return raw
  return {
    id: raw.id,
    targetType: raw.target?.type ?? raw.targetType ?? 'course',
    targetId: raw.target?.id ?? raw.targetId ?? '',
    targetName: raw.target?.name ?? raw.targetName ?? '',
    authorId: raw.author?.id ?? raw.authorId ?? '',
    authorName: raw.anonymous ? 'Аноним' : (raw.author?.name ?? raw.authorName ?? ''),
    authorAvatarUrl: raw.author?.avatar ?? raw.authorAvatarUrl,
    rating: raw.ratings?.overall ?? raw.rating ?? 0,
    difficulty: raw.ratings?.difficulty ?? raw.difficulty ?? 0,
    usefulness: raw.ratings?.usefulness ?? raw.usefulness ?? 0,
    semester: raw.semester ?? '',
    text: raw.text ?? '',
    isAnonymous: raw.anonymous ?? raw.isAnonymous ?? false,
    likeCount: raw.likes ?? raw.likeCount ?? 0,
    isLiked: raw.isLiked,
    createdAt: raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const reviewsService = {
  getReviews: async (params?: ReviewsParams): Promise<PaginatedResponse<Review>> => {
    const raw = await api.get<unknown>(`/reviews${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapReview)
  },

  getReviewById: async (id: string) => {
    const raw = await api.get<any>(`/reviews/${id}`)
    return mapReview(raw)
  },

  createReview: async (data: CreateReviewData) => {
    const raw = await api.post<any>('/reviews', data)
    return mapReview(raw)
  },

  likeReview: (id: string) =>
    api.post<{ liked: boolean; likeCount: number }>(`/reviews/${id}/helpful`),

  deleteReview: (id: string) =>
    api.del<{ message: string }>(`/reviews/${id}`),

  reportReview: (id: string, reason: string) =>
    api.post<{ message: string }>(`/reviews/${id}/report`, { reason }),
}
