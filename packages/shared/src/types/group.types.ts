import type { GroupType } from '../constants/group-types.js'
import type { CourseCompact } from './course.types.js'

export interface GroupMember {
  userId: string
  name: string
  role: 'leader' | 'member'
  joinedAt: string
}

export interface Group {
  id: string
  name: string
  course: CourseCompact
  type: GroupType
  description: string
  members: GroupMember[]
  maxMembers: number
  status: 'open' | 'full' | 'closed'
  createdBy: string
  createdAt: string
}
