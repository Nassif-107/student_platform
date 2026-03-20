export const REVIEW_TARGETS = {
  COURSE: 'course',
  PROFESSOR: 'professor',
} as const

export type ReviewTarget = (typeof REVIEW_TARGETS)[keyof typeof REVIEW_TARGETS]
