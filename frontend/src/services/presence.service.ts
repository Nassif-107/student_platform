import { api } from './api'

/**
 * Check online status for a list of user IDs.
 * Returns a map of userId → boolean.
 */
export const presenceService = {
  getOnlineStatuses: async (userIds: string[]): Promise<Record<string, boolean>> => {
    if (userIds.length === 0) return {}
    const raw = await api.post<Record<string, boolean>>('/social/presence', {
      userIds,
    })
    return raw ?? {}
  },
}
