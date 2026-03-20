import type { Role } from '../constants/roles.js'

export interface UserName {
  first: string
  last: string
  patronymic?: string
}

export interface UserSocialLinks {
  telegram?: string
  vk?: string
  github?: string
  phone?: string
}

export interface UserNotificationSettings {
  email: boolean
  push: boolean
  deadlines: boolean
  newMaterials: boolean
  forumReplies: boolean
  friendActivity: boolean
}

export interface UserPrivacySettings {
  showEmail: boolean
  showContacts: boolean
  showActivity: boolean
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  notifications: UserNotificationSettings
  privacy: UserPrivacySettings
}

export interface UserStats {
  materialsUploaded: number
  reviewsWritten: number
  questionsAsked: number
  answersAccepted: number
  reputation: number
}

export interface User {
  id: string
  email: string
  passwordHash: string
  role: Role
  name: UserName
  university: {
    id: string
    name: string
  }
  faculty: string
  specialization: string
  year: number
  avatar?: string
  bio?: string
  socialLinks: UserSocialLinks
  skills: string[]
  interests: string[]
  settings: UserSettings
  stats: UserStats
  emailVerified: boolean
  lastActiveAt: string
  createdAt: string
  updatedAt: string
}

export interface UserPublic extends Omit<User, 'passwordHash' | 'emailVerified'> {}

export interface UserCompact {
  id: string
  name: UserName
  avatar?: string
}
