import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface ForumAttachment {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

export interface ForumQuestion {
  id: string
  title: string
  body: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  courseId?: string
  courseName?: string
  tags: string[]
  attachments: ForumAttachment[]
  answerCount: number
  viewCount: number
  voteCount: number
  isSolved: boolean
  acceptedAnswerId?: string
  isVoted?: 'up' | 'down' | null
  createdAt: string
  updatedAt: string
}

export interface ForumAnswer {
  id: string
  questionId: string
  body: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  attachments: ForumAttachment[]
  voteCount: number
  isAccepted: boolean
  isVoted?: 'up' | 'down' | null
  createdAt: string
  updatedAt: string
}

export interface ForumParams {
  page?: number
  limit?: number
  search?: string
  courseId?: string
  tag?: string
  isSolved?: boolean
  sortBy?: 'createdAt' | 'voteCount' | 'answerCount' | 'viewCount'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateQuestionData {
  title: string
  body: string
  courseId?: string
  tags: string[]
}

export interface QuestionDetailResponse {
  question: ForumQuestion
  answers: ForumAnswer[]
  answersPagination: {
    page: number
    limit: number
    total: number
  }
}

export interface CreateAnswerData {
  body: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapQuestion(raw: any): ForumQuestion {
  if (!raw) return raw
  return {
    id: raw.id,
    title: raw.title ?? '',
    body: raw.body ?? '',
    authorId: raw.author?.id ?? raw.authorId ?? '',
    authorName: raw.author?.name ?? raw.authorName ?? '',
    authorAvatarUrl: raw.author?.avatar ?? raw.authorAvatarUrl,
    courseId: raw.course?.id ?? raw.courseId,
    courseName: raw.course?.title ?? raw.courseName,
    tags: raw.tags ?? [],
    attachments: raw.attachments ?? [],
    answerCount: raw.answerCount ?? 0,
    viewCount: raw.views ?? raw.viewCount ?? 0,
    voteCount: raw.voteCount ?? raw.votes ?? 0,
    isSolved: raw.hasAcceptedAnswer ?? raw.isSolved ?? raw.status === 'resolved',
    acceptedAnswerId: raw.acceptedAnswerId,
    isVoted: raw.isVoted ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function mapAnswer(raw: any): ForumAnswer {
  if (!raw) return raw
  return {
    id: raw.id,
    questionId: raw.questionId ?? '',
    body: raw.body ?? '',
    authorId: raw.author?.id ?? raw.authorId ?? '',
    authorName: raw.author?.name ?? raw.authorName ?? '',
    authorAvatarUrl: raw.author?.avatar ?? raw.authorAvatarUrl,
    attachments: raw.attachments ?? [],
    voteCount: raw.votes ?? raw.voteCount ?? 0,
    isAccepted: raw.isAccepted ?? false,
    isVoted: raw.isVoted ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Translate frontend ForumParams → backend query format */
function toBackendForumParams(params?: ForumParams): Record<string, string | number | undefined> {
  if (!params) return {}
  const { courseId, tag, isSolved, sortBy, sortOrder, search, page, limit } = params
  // Backend expects: sort as "-field" string, status as "open"/"resolved", tags as CSV
  const sortPrefix = sortOrder === 'asc' ? '' : '-'
  return {
    courseId,
    tags: tag,
    status: isSolved === undefined ? undefined : isSolved ? 'resolved' : 'open',
    search,
    sort: sortBy ? `${sortPrefix}${sortBy}` : undefined,
    page,
    limit,
  }
}

export const forumService = {
  getQuestions: async (params?: ForumParams): Promise<PaginatedResponse<ForumQuestion>> => {
    const raw = await api.get<unknown>(`/forum/questions${buildQueryString(toBackendForumParams(params))}`)
    return mapPaginatedResponse(raw, mapQuestion)
  },

  getQuestionById: async (id: string) => {
    const raw = await api.get<any>(`/forum/questions/${id}`)
    return {
      question: mapQuestion(raw.question ?? raw),
      answers: (raw.answers ?? []).map(mapAnswer),
      answersPagination: raw.answersPagination ?? { page: 1, limit: 20, total: 0 },
    } as QuestionDetailResponse
  },

  createQuestion: async (data: CreateQuestionData, files?: File[]) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('body', data.body)
    if (data.courseId) formData.append('courseId', data.courseId)
    if (data.tags.length > 0) formData.append('tags', JSON.stringify(data.tags))
    files?.forEach((f) => formData.append('files', f))
    const raw = await api.post<any>('/forum/questions', formData)
    return mapQuestion(raw)
  },

  updateQuestion: async (id: string, data: Partial<CreateQuestionData>) => {
    const raw = await api.patch<any>(`/forum/questions/${id}`, data)
    return mapQuestion(raw)
  },

  deleteQuestion: (id: string) =>
    api.del<{ message: string }>(`/forum/questions/${id}`),

  voteQuestion: (id: string, direction: 'up' | 'down') =>
    api.post<{ voteCount: number }>(`/forum/questions/${id}/vote`, {
      value: direction === 'up' ? 1 : -1,
    }),

  createAnswer: async (questionId: string, data: CreateAnswerData, files?: File[]) => {
    const formData = new FormData()
    formData.append('body', data.body)
    files?.forEach((f) => formData.append('files', f))
    const raw = await api.post<any>(`/forum/questions/${questionId}/answers`, formData)
    return mapAnswer(raw)
  },

  acceptAnswer: (questionId: string, answerId: string) =>
    api.patch<{ message: string }>(
      `/forum/questions/${questionId}/answers/${answerId}/accept`, {},
    ),

  voteAnswer: (questionId: string, answerId: string, direction: 'up' | 'down') =>
    api.post<{ voteCount: number }>(`/forum/questions/${questionId}/answers/${answerId}/vote`, {
      value: direction === 'up' ? 1 : -1,
    }),

}
