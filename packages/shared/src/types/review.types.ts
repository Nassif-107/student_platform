import type { ReviewTarget } from '../constants/review-targets.js'
import type { UserCompact } from './user.types.js'

export interface ReviewRatings {
  /** 1-10 scale */
  overall: number
  /** 1-10 scale */
  difficulty: number
  /** 1-10 scale */
  usefulness: number
  /** 1-10 scale, professor reviews only */
  teachingQuality?: number
  /** 1-10 scale, course reviews only */
  materialQuality?: number
}

export interface Review {
  id: string
  target: {
    type: ReviewTarget
    id: string
    name: string
  }
  author: UserCompact
  anonymous: boolean
  ratings: ReviewRatings
  text: string
  semester: string
  likes: number
  reports: number
  status: 'active' | 'hidden' | 'removed'
  createdAt: string
}
