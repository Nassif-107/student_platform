import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface MaterialFile {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

export interface Material {
  id: string
  title: string
  description: string
  type: string
  courseId?: string
  courseName?: string
  courseCode?: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  files: MaterialFile[]
  fileUrl: string
  fileType: string
  fileSize: number
  viewCount: number
  downloadCount: number
  likeCount: number
  commentCount: number
  tags: string[]
  isLiked?: boolean
  createdAt: string
  updatedAt: string
}

export interface MaterialComment {
  id: string
  text: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  createdAt: string
}

export interface MaterialsParams {
  page?: number
  limit?: number
  search?: string
  courseId?: string
  authorId?: string
  fileType?: string
  sortBy?: 'createdAt' | 'downloadCount' | 'likeCount'
  sortOrder?: 'asc' | 'desc'
  tags?: string[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMaterial(raw: any): Material {
  if (!raw) return raw
  const filesArr = raw.files ?? []
  const firstFile = filesArr[0]
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    type: raw.type ?? 'other',
    courseId: raw.course?.id ?? raw.courseId,
    courseName: raw.course?.title ?? raw.courseName,
    courseCode: raw.course?.code ?? raw.courseCode,
    authorId: raw.author?.id ?? raw.authorId ?? '',
    authorName: raw.author?.name ?? raw.authorName ?? '',
    authorAvatarUrl: raw.author?.avatar ?? raw.authorAvatarUrl,
    files: filesArr,
    fileUrl: firstFile?.url ?? raw.fileUrl ?? '',
    fileType: firstFile?.mimeType ?? raw.fileType ?? '',
    fileSize: firstFile?.size ?? raw.fileSize ?? 0,
    viewCount: raw.stats?.views ?? raw.viewCount ?? 0,
    downloadCount: raw.stats?.downloads ?? raw.downloadCount ?? 0,
    likeCount: raw.stats?.likes ?? raw.likeCount ?? 0,
    commentCount: raw.stats?.commentCount ?? raw.commentCount ?? 0,
    tags: raw.tags ?? [],
    isLiked: raw.isLiked,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function mapComment(raw: any): MaterialComment {
  return {
    id: raw.id,
    text: raw.text ?? '',
    authorId: raw.author?.id ?? raw.authorId ?? '',
    authorName: raw.author?.name ?? raw.authorName ?? '',
    authorAvatarUrl: raw.author?.avatar ?? raw.authorAvatarUrl,
    createdAt: raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const materialsService = {
  getMaterials: async (params?: MaterialsParams): Promise<PaginatedResponse<Material>> => {
    const raw = await api.get<unknown>(`/materials${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapMaterial)
  },

  getMaterialById: async (id: string) => {
    const raw = await api.get<any>(`/materials/${id}`)
    if (raw.material) {
      return {
        ...mapMaterial(raw.material),
        comments: (raw.comments ?? []).map(mapComment),
      }
    }
    return mapMaterial(raw)
  },

  uploadMaterial: async (formData: FormData) => {
    const raw = await api.post<any>('/materials', formData)
    return mapMaterial(raw)
  },

  likeMaterial: (id: string) =>
    api.post<{ liked: boolean; likeCount: number }>(`/materials/${id}/like`),

  addComment: async (id: string, text: string) => {
    const raw = await api.post<any>(`/materials/${id}/comments`, { text })
    return mapComment(raw)
  },

  downloadMaterial: (id: string) =>
    api.get<{ url: string }>(`/materials/${id}/download`),

  deleteMaterial: (id: string) =>
    api.del<{ message: string }>(`/materials/${id}`),
}
