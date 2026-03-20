import type { MaterialType } from '../constants/material-types.js'
import type { CourseCompact } from './course.types.js'
import type { UserCompact } from './user.types.js'

export interface MaterialFile {
  url: string
  filename: string
  size: number
  mimeType: string
}

export interface MaterialStats {
  views: number
  downloads: number
  likes: number
  avgRating: number
  ratingCount: number
}

export interface Material {
  id: string
  title: string
  course: CourseCompact
  type: MaterialType
  description?: string
  author: UserCompact
  files: MaterialFile[]
  tags: string[]
  semester: string
  stats: MaterialStats
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface MaterialCompact {
  id: string
  title: string
  type: MaterialType
  course: CourseCompact
  author: UserCompact
  stats: Pick<MaterialStats, 'likes' | 'downloads' | 'avgRating'>
  createdAt: string
}
