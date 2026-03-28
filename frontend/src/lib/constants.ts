export const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'

export const DEFAULT_PAGE_SIZE = 20

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const ACCEPTED_FILE_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  archives: ['application/zip', 'application/x-rar-compressed'],
} as const

export const ACCEPTED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.zip',
  '.rar',
] as const

/**
 * Route definitions for navigation.
 * All page components are lazy-loaded via React.lazy() in App.tsx.
 * Vite automatically handles route prefetching through code-splitting:
 * dynamic import() chunks are preloaded by the browser via <link rel="modulepreload">.
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: (id: string) => `/profile/${id}`,
  EDIT_PROFILE: '/profile/edit',
  COURSES: '/courses',
  COURSE_DETAIL: (id: string) => `/courses/${id}`,
  PROFESSORS: '/professors',
  PROFESSOR_DETAIL: (id: string) => `/professors/${id}`,
  MATERIALS: '/materials',
  MATERIAL_UPLOAD: '/materials/upload',
  MATERIAL_DETAIL: (id: string) => `/materials/${id}`,
  FORUM: '/forum',
  ASK_QUESTION: '/forum/ask',
  QUESTION_DETAIL: (id: string) => `/forum/${id}`,
  GROUPS: '/groups',
  FIND_TEAM: '/groups/find',
  GROUP_DETAIL: (id: string) => `/groups/${id}`,
  DEADLINES: '/deadlines',
  MARKETPLACE: '/marketplace',
  NEW_LISTING: '/marketplace/new',
  LISTING_DETAIL: (id: string) => `/marketplace/${id}`,
  EVENTS: '/events',
  EVENT_DETAIL: (id: string) => `/events/${id}`,
  ANALYTICS: '/analytics',
  FRIENDS: '/friends',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
} as const
