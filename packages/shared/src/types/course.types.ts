import type { CourseType } from '../constants/course-types.js'

export interface CourseSchedule {
  dayOfWeek: number
  time: string
  room: string
  type: string
}

export interface CourseStats {
  avgRating: number
  reviewCount: number
  avgDifficulty: number
  materialCount: number
  enrolledCount: number
  enrollmentTrend?: number
}

export interface Course {
  id: string
  title: string
  code: string
  description: string
  university: string
  faculty: string
  year: number
  semester: number
  type: CourseType
  credits: number
  professor: {
    id: string
    name: string
  }
  schedule: CourseSchedule[]
  tags: string[]
  stats: CourseStats
  createdAt: string
  updatedAt: string
}

export interface CourseCompact {
  id: string
  title: string
  code: string
}
