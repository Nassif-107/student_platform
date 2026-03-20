import type { UserCompact } from './user.types.js'

export interface Question {
  id: string
  title: string
  body: string
  course?: string
  author: UserCompact
  tags: string[]
  views: number
  answerCount: number
  hasAcceptedAnswer: boolean
  status: 'open' | 'closed' | 'resolved'
  createdAt: string
  updatedAt: string
}

export interface Answer {
  id: string
  questionId: string
  author: UserCompact
  body: string
  votes: number
  isAccepted: boolean
  createdAt: string
}
