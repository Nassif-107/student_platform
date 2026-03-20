export const MATERIAL_TYPES = {
  SYNOPSIS: 'конспект',
  LAB: 'лабораторная',
  CHEATSHEET: 'шпаргалка',
  EXAM: 'экзамен',
  PRESENTATION: 'презентация',
  OTHER: 'другое',
} as const

export type MaterialType = (typeof MATERIAL_TYPES)[keyof typeof MATERIAL_TYPES]
