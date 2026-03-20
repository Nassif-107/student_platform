import { useQuery } from '@tanstack/react-query'
import { presenceService } from '@/services/presence.service'

export function usePresence(userIds: string[]) {
  return useQuery({
    queryKey: ['presence', ...userIds.sort()],
    queryFn: () => presenceService.getOnlineStatuses(userIds),
    refetchInterval: 30_000,
    enabled: userIds.length > 0,
    staleTime: 15_000,
  })
}
