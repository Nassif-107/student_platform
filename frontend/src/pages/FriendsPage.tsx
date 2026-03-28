import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { OnlineIndicator } from '@/components/shared/OnlineIndicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { socialService } from '@/services/social.service'
import { useDebounce } from '@/hooks/useDebounce'
import { usePresence } from '@/hooks/usePresence'
import { ROUTES } from '@/lib/constants'

const container = { show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

interface FriendUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
  faculty?: string
  isOnline?: boolean
  mutualFriends?: number
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  )
}

function UserCard({
  user,
  actions,
  isOnline,
}: {
  user: FriendUser
  actions: React.ReactNode
  isOnline?: boolean
}) {
  return (
    <motion.div variants={item} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30">
      <div className="relative">
        <Avatar className="h-12 w-12">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.firstName} />}
          <AvatarFallback>{user.firstName?.[0] ?? ''}{user.lastName?.[0] ?? ''}</AvatarFallback>
        </Avatar>
        {isOnline !== undefined && (
          <OnlineIndicator isOnline={isOnline} size="md" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {user.firstName} {user.lastName}
        </p>
        {user.faculty && (
          <p className="text-xs text-muted-foreground truncate">
            {user.faculty}
          </p>
        )}
        {user.mutualFriends !== undefined && user.mutualFriends > 0 && (
          <p className="text-xs text-muted-foreground">
            {user.mutualFriends} общих друзей
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    </motion.div>
  )
}

export function FriendsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const debouncedSearch = useDebounce(searchQuery, 400)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => socialService.getFriends(),
    enabled: activeTab === 'friends',
  })

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => socialService.getFriendRequests(),
  })

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['friend-suggestions'],
    queryFn: () => socialService.getFriendSuggestions(),
    enabled: activeTab === 'suggestions',
  })

  const { data: classmates, isLoading: classmatesLoading } = useQuery({
    queryKey: ['classmates'],
    queryFn: () => socialService.getClassmates(),
    enabled: activeTab === 'classmates',
  })

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['user-search', debouncedSearch],
    queryFn: () => socialService.searchUsers(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  })

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => socialService.sendFriendRequest(userId),
    onMutate: (userId) => { setPendingUserId(userId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['user-search'] })
      toast({ title: 'Запрос отправлен', variant: 'success' })
      setPendingUserId(null)
    },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось отправить запрос', variant: 'error' }); setPendingUserId(null) },
  })

  const acceptRequestMutation = useMutation({
    mutationFn: (userId: string) => socialService.acceptFriendRequest(userId),
    onMutate: (userId) => { setPendingUserId(userId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      toast({ title: 'Друг добавлен', variant: 'success' })
      setPendingUserId(null)
    },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось принять запрос', variant: 'error' }); setPendingUserId(null) },
  })

  const rejectRequestMutation = useMutation({
    mutationFn: (userId: string) => socialService.rejectFriendRequest(userId),
    onMutate: (userId) => { setPendingUserId(userId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      toast({ title: 'Запрос отклонён', variant: 'success' })
      setPendingUserId(null)
    },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось отклонить запрос', variant: 'error' }); setPendingUserId(null) },
  })

  const removeFriendMutation = useMutation({
    mutationFn: (userId: string) => socialService.removeFriend(userId),
    onMutate: (userId) => { setPendingUserId(userId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast({ title: 'Друг удалён', variant: 'success' })
      setPendingUserId(null)
    },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить друга', variant: 'error' }); setPendingUserId(null) },
  })

  const friendsList = friends?.items ?? []
  const friendIds = friendsList.map((f: FriendUser) => f.id)
  const { data: presenceMap } = usePresence(friendIds)
  const filteredFriends = friendsList.filter((f: FriendUser) =>
    debouncedSearch.length >= 2
      ? `${f.firstName} ${f.lastName}`.toLowerCase().includes(debouncedSearch.toLowerCase())
      : true,
  )

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Друзья</h1>
        <p className="text-muted-foreground">Управляйте социальными связями</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск людей..."
          className="pl-10"
        />
      </div>

      {debouncedSearch.length >= 2 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Результаты поиска
          </h2>
          {searchLoading ? (
            Array.from({ length: 3 }, (_, i) => <UserSkeleton key={i} />)
          ) : !searchResults?.items?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Никого не найдено
            </p>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {searchResults.items.map((user: FriendUser) => (
                <UserCard
                  key={user.id}
                  user={user}
                  actions={
                    <Button
                      size="sm"
                      onClick={() => sendRequestMutation.mutate(user.id)}
                      disabled={pendingUserId === user.id}
                    >
                      <UserPlus className="h-4 w-4" /> Добавить
                    </Button>
                  }
                />
              ))}
            </motion.div>
          )}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="friends">
              Друзья{friendsList.length ? ` (${friendsList.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Запросы{requests?.length ? ` (${requests.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="suggestions">Рекомендации</TabsTrigger>
            <TabsTrigger value="classmates">Однокурсники</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-3">
            <AnimatePresence mode="wait">
              {friendsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => <UserSkeleton key={i} />)}
                </div>
              ) : !filteredFriends?.length ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    {searchQuery ? 'Друзей не найдено' : 'Список друзей пуст'}
                  </p>
                </motion.div>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                  {filteredFriends.map((user: FriendUser) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      isOnline={presenceMap?.[user.id] ?? false}
                      actions={
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Профиль"
                            onClick={() => navigate(ROUTES.PROFILE(user.id))}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            title="Удалить из друзей"
                            onClick={() => removeFriendMutation.mutate(user.id)}
                            disabled={pendingUserId === user.id}
                          >
                            {pendingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                          </Button>
                        </>
                      }
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="requests" className="space-y-3">
            {requestsLoading ? (
              Array.from({ length: 3 }, (_, i) => <UserSkeleton key={i} />)
            ) : !requests?.length ? (
              <div className="flex flex-col items-center py-16">
                <UserPlus className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Нет входящих запросов</p>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {requests.map((req) => {
                  const parts = (req.fromUserName ?? '').split(' ')
                  const reqUser: FriendUser = {
                    id: req.fromUserId,
                    firstName: parts[0] ?? '',
                    lastName: parts.slice(1).join(' '),
                    avatarUrl: req.fromUserAvatarUrl,
                    faculty: req.faculty,
                  }
                  return (
                    <UserCard
                      key={req.id}
                      user={reqUser}
                      actions={
                        <>
                          <Button
                            size="sm"
                            onClick={() => acceptRequestMutation.mutate(req.fromUserId)}
                            disabled={pendingUserId === req.fromUserId}
                          >
                            {pendingUserId === req.fromUserId && acceptRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectRequestMutation.mutate(req.fromUserId)}
                            disabled={pendingUserId === req.fromUserId}
                          >
                            {pendingUserId === req.fromUserId && rejectRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Отклонить
                          </Button>
                        </>
                      }
                    />
                  )
                })}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-3">
            {suggestionsLoading ? (
              Array.from({ length: 4 }, (_, i) => <UserSkeleton key={i} />)
            ) : !suggestions?.length ? (
              <div className="flex flex-col items-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Нет рекомендаций</p>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {suggestions.map((user: FriendUser) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    actions={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={pendingUserId === user.id}
                      >
                        {pendingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Добавить
                      </Button>
                    }
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="classmates" className="space-y-3">
            {classmatesLoading ? (
              Array.from({ length: 4 }, (_, i) => <UserSkeleton key={i} />)
            ) : !classmates?.length ? (
              <div className="flex flex-col items-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Однокурсники не найдены</p>
                <p className="mt-1 text-xs text-muted-foreground">Запишитесь на курсы, чтобы увидеть однокурсников</p>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {classmates.map((user: FriendUser) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    actions={
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Профиль"
                          onClick={() => navigate(ROUTES.PROFILE(user.id))}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendRequestMutation.mutate(user.id)}
                          disabled={pendingUserId === user.id}
                        >
                          {pendingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Добавить
                        </Button>
                      </>
                    }
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </PageTransition>
  )
}
