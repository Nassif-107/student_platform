export const ROLES = {
  STUDENT: 'student',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
