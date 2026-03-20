export const COURSE_TYPES = {
  REQUIRED: 'обязательный',
  ELECTIVE: 'по выбору',
  OPTIONAL: 'факультатив',
} as const

export type CourseType = (typeof COURSE_TYPES)[keyof typeof COURSE_TYPES]
