import { api } from './api'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  patronymic?: string
  avatarUrl?: string
  university?: string
  faculty?: string
  specialization?: string
  course?: number
  bio?: string
  role: 'student' | 'moderator' | 'admin'
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  patronymic?: string
  universityId: string
  faculty: string
  specialization: string
  year: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapUser(raw: any): User {
  if (!raw) return raw
  return {
    id: raw.id ?? raw._id,
    email: raw.email ?? '',
    firstName: raw.name?.first ?? raw.firstName ?? '',
    lastName: raw.name?.last ?? raw.lastName ?? '',
    patronymic: raw.name?.patronymic ?? raw.patronymic,
    avatarUrl: raw.avatar ?? raw.avatarUrl,
    university: raw.university?.name ?? raw.university,
    faculty: raw.faculty,
    specialization: raw.specialization,
    course: raw.year ?? raw.course,
    bio: raw.bio,
    role: raw.role ?? 'student',
    createdAt: raw.createdAt,
  }
}

function mapLoginResponse(raw: any): LoginResponse {
  return {
    user: mapUser(raw.user),
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const authService = {
  login: async (email: string, password: string) => {
    const raw = await api.post<any>('/auth/login', { email, password })
    return mapLoginResponse(raw)
  },

  register: async (data: RegisterData) => {
    const raw = await api.post<any>('/auth/register', data)
    return mapLoginResponse(raw)
  },

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: () => api.post<void>('/auth/logout'),

  getMe: async () => {
    const raw = await api.get<any>('/auth/me')
    return mapUser(raw)
  },

  deleteAccount: () => api.del<void>('/users/me'),
}
