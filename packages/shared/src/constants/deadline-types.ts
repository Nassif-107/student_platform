export const DEADLINE_TYPES = {
  LAB: 'лабораторная',
  COURSEWORK: 'курсовая',
  EXAM: 'экзамен',
  CREDIT: 'зачёт',
  HOMEWORK: 'домашнее задание',
  OTHER: 'другое',
} as const

export type DeadlineType = (typeof DEADLINE_TYPES)[keyof typeof DEADLINE_TYPES]
