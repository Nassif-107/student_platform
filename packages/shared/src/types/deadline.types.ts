import type { DeadlineType } from '../constants/deadline-types.js'
import type { CourseCompact } from './course.types.js'
import type { UserCompact } from './user.types.js'

export interface Deadline {
  id: string
  course: CourseCompact
  title: string
  type: DeadlineType
  description?: string
  dueDate: string
  createdBy: UserCompact
  confirmations: number
  createdAt: string
}
