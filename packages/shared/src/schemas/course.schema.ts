import { z } from 'zod'
import { COURSE_TYPES } from '../constants/course-types.js'

const courseTypeValues = Object.values(COURSE_TYPES) as [string, ...string[]]

export const createCourseSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  code: z.string().min(1).max(20).trim(),
  description: z.string().max(2000).trim(),
  university: z.string().min(1),
  faculty: z.string().min(1).max(100).trim(),
  year: z.coerce.number().int().min(1).max(6),
  semester: z.coerce.number().int().min(1).max(2),
  type: z.enum(courseTypeValues),
  credits: z.coerce.number().int().min(1).max(30),
  professorId: z.string().min(1),
  professorName: z.string().min(1),
  schedule: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        time: z.string().min(1),
        room: z.string().min(1),
        type: z.string().min(1),
      })
    )
    .max(20)
    .optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const updateCourseSchema = createCourseSchema.partial()

export const courseQuerySchema = z.object({
  universityId: z.string().optional(),
  faculty: z.string().optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  semester: z.coerce.number().int().min(1).max(2).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['title', 'rating', 'newest', 'popular']).default('title'),
})

export const enrollCourseSchema = z.object({
  courseId: z.string().min(1),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type CourseQueryInput = z.infer<typeof courseQuerySchema>
export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>
