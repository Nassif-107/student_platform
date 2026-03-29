import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Listing {
  id: string
  title: string
  description: string
  price: number
  currency: string
  type: string
  condition?: string
  images: string[]
  location?: string
  courseId?: string
  courseName?: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  university?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ListingsParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  condition?: string
  sellerId?: string
  minPrice?: number
  maxPrice?: number
  university?: string
  status?: string
  sortBy?: 'createdAt' | 'price'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateListingData {
  title: string
  description: string
  price: number
  type: string
  condition?: string
  photos?: string[]
  location?: string
  course?: { id?: string; title?: string }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapListing(raw: any): Listing {
  if (!raw) return raw
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    price: raw.price ?? 0,
    currency: raw.currency ?? '₽',
    type: raw.type ?? 'sell',
    condition: raw.condition,
    images: raw.photos ?? raw.images ?? [],
    location: raw.location,
    courseId: raw.course?.id ?? raw.courseId,
    courseName: raw.course?.title ?? raw.courseName,
    authorId: raw.seller?.id ?? raw.authorId ?? '',
    authorName: raw.seller?.name ?? raw.authorName ?? '',
    authorAvatarUrl: raw.seller?.avatar ?? raw.authorAvatarUrl,
    university: raw.seller?.university ?? raw.university,
    status: raw.status ?? 'active',
    isActive: raw.status === 'active' || raw.isActive === true,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const marketplaceService = {
  getListings: async (params?: ListingsParams): Promise<PaginatedResponse<Listing>> => {
    const raw = await api.get<unknown>(`/marketplace${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapListing)
  },

  getListingById: async (id: string) => {
    const raw = await api.get<any>(`/marketplace/${id}`)
    return mapListing(raw)
  },

  createListing: async (data: CreateListingData, files?: File[]) => {
    if (files && files.length > 0) {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('price', String(data.price))
      formData.append('type', data.type)
      if (data.condition) formData.append('condition', data.condition)
      if (data.location) formData.append('location', data.location)
      if (data.course?.title) formData.append('courseTitle', data.course.title)
      files.forEach((file) => formData.append('photos', file))
      const raw = await api.post<any>('/marketplace', formData)
      return mapListing(raw)
    }
    const raw = await api.post<any>('/marketplace', data)
    return mapListing(raw)
  },

  updateListingStatus: async (id: string, status: 'active' | 'reserved' | 'sold' | 'closed') => {
    const raw = await api.patch<any>(`/marketplace/${id}`, { status })
    return mapListing(raw)
  },

  deleteListing: (id: string) =>
    api.del<{ message: string }>(`/marketplace/${id}`),

  toggleActive: (id: string) =>
    api.post<{ isActive: boolean }>(`/marketplace/${id}/toggle`),

  contactSeller: (id: string, message: string) =>
    api.post<{ message: string }>(`/marketplace/${id}/contact`, { message }),
}
