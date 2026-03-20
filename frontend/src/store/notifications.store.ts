import { create } from 'zustand'

interface NotificationState {
  unreadCount: number
  setUnreadCount: (n: number) => void
  increment: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,

  setUnreadCount: (n) => set({ unreadCount: n }),

  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  reset: () => set({ unreadCount: 0 }),
}))
