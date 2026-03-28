import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export type { PaginatedResponse }

export interface Course {
  id: string
  name: string
  code: string
  description: string
  university: string
  faculty: string
  year: number
  semester: number
  type: string
  credits: number
  professorId: string
  professorName: string
  enrolledCount: number
  rating: number
  reviewCount: number
  difficulty: number
  materialCount: number
  tags: string[]
  createdAt: string
}

export interface CourseStudent {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
  enrolledAt: string
}

export interface CoursesParams {
  page?: number
  limit?: number
  search?: string
  university?: string
  faculty?: string
  semester?: number
  sortBy?: 'name' | 'rating' | 'enrolledCount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCourse(raw: any): Course {
  if (!raw) return raw
  return {
    id: raw.id ?? '',
    name: raw.title ?? raw.name ?? '',
    code: raw.code ?? '',
    description: raw.description ?? '',
    university: raw.university?.name ?? raw.university ?? '',
    faculty: raw.faculty ?? '',
    semester: raw.semester ?? 1,
    credits: raw.credits ?? 0,
    professorId: raw.professor?.id ?? raw.professorId ?? '',
    professorName: raw.professor?.name ?? raw.professorName ?? '',
    year: raw.year ?? 1,
    type: raw.type ?? '',
    enrolledCount: raw.stats?.enrolledCount ?? raw.enrolledCount ?? 0,
    rating: raw.stats?.avgRating ?? raw.rating ?? 0,
    reviewCount: raw.stats?.reviewCount ?? raw.reviewCount ?? 0,
    difficulty: raw.stats?.avgDifficulty ?? raw.difficulty ?? 0,
    materialCount: raw.stats?.materialCount ?? raw.materialCount ?? 0,
    tags: raw.tags ?? [],
    createdAt: raw.createdAt,
  }
}

function mapCourseStudent(raw: any): CourseStudent {
  return {
    id: raw.id ?? '',
    firstName: raw.name?.first ?? raw.firstName ?? '',
    lastName: raw.name?.last ?? raw.lastName ?? '',
    avatarUrl: raw.avatar ?? raw.avatarUrl,
    enrolledAt: raw.enrolledAt ?? raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const coursesService = {
  getCourses: async (params?: CoursesParams): Promise<PaginatedResponse<Course>> => {
    const raw = await api.get<unknown>(`/courses${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapCourse)
  },

  getCourseById: async (id: string): Promise<Course> => {
    const raw = await api.get<unknown>(`/courses/${id}`)
    return mapCourse(raw)
  },

  enrollInCourse: (id: string) =>
    api.post<{ message: string }>(`/courses/${id}/enroll`),

  getPrerequisites: async (id: string): Promise<Course[]> => {
    const raw = await api.get<unknown[]>(`/courses/${id}/prerequisites`)
    return (raw ?? []).map(mapCourse)
  },

  getCourseStudents: async (id: string): Promise<CourseStudent[]> => {
    const raw = await api.get<unknown[]>(`/courses/${id}/students`)
    return (raw ?? []).map(mapCourseStudent)
  },

  getCourseMaterials: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<unknown>> => {
    const raw = await api.get<unknown>(`/courses/${id}/materials${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, (r) => r)
  },

  getCourseQuestions: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<unknown>> => {
    const raw = await api.get<unknown>(`/courses/${id}/questions${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, (r) => r)
  },

  getCourseDeadlines: async (id: string): Promise<unknown[]> => {
    const raw = await api.get<unknown[]>(`/courses/${id}/deadlines`)
    return Array.isArray(raw) ? raw : []
  },

  getRecommendations: async (): Promise<Course[]> => {
    const raw = await api.get<unknown>('/courses/recommendations')
    const items = Array.isArray(raw) ? raw : ((raw as any)?.items ?? [])
    return items.map(mapCourse)
  },
}
