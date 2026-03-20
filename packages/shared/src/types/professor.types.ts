export interface ProfessorName {
  first: string
  last: string
  patronymic?: string
}

export interface ProfessorStats {
  avgRating: number
  reviewCount: number
  courseCount: number
}

export interface Professor {
  id: string
  name: ProfessorName
  university: string
  faculty: string
  department: string
  position: string
  email?: string
  avatar?: string
  stats: ProfessorStats
  createdAt: string
}
