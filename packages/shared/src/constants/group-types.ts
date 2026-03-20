export const GROUP_TYPES = {
  STUDY: 'study',
  PROJECT: 'project',
  EXAM_PREP: 'exam_prep',
} as const

export type GroupType = (typeof GROUP_TYPES)[keyof typeof GROUP_TYPES]
