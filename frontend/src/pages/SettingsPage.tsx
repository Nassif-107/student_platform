import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Shield,
  LogOut,
  Languages,
  Palette,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { socialService, type UpdateProfileData } from '@/services/social.service'
import { authService } from '@/services/auth.service'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const themeOptions = [
  { value: 'light' as const, label: 'Светлая', icon: Sun },
  { value: 'dark' as const, label: 'Тёмная', icon: Moon },
  { value: 'system' as const, label: 'Системная', icon: Monitor },
]

export function SettingsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const { theme, setTheme } = useUIStore()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => socialService.getProfile(user!.id),
    enabled: !!user?.id,
  })

  const [notifications, setNotifications] = useState({
    deadlines: true,
    materials: true,
    friends: true,
    forum: true,
  })

  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showPhone: false,
    allowMessages: 'friends' as 'all' | 'friends' | 'none',
  })

  useEffect(() => {
    if (profile) {
      if (profile.settings?.notifications) {
        setNotifications({
          deadlines: profile.settings.notifications.deadlines ?? true,
          materials: profile.settings.notifications.materials ?? true,
          friends: profile.settings.notifications.friends ?? true,
          forum: profile.settings.notifications.forum ?? true,
        })
      }
      if (profile.settings?.privacy) {
        setPrivacy({
          showEmail: profile.settings.privacy.showEmail ?? false,
          showPhone: profile.settings.privacy.showPhone ?? false,
          allowMessages: profile.settings.privacy.allowMessages ?? 'friends',
        })
      }
    }
  }, [profile])

  const settingsMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => socialService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Настройки сохранены', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Ошибка сохранения', variant: 'error' })
    },
  })

  const toggleNotification = (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    settingsMutation.mutate({ settings: { notifications: updated } })
  }

  const togglePrivacy = (key: 'showEmail' | 'showPhone') => {
    const updated = { ...privacy, [key]: !privacy[key] }
    setPrivacy(updated)
    settingsMutation.mutate({ settings: { privacy: updated } })
  }

  return (
    <PageTransition className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Настройки</h1>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-5 w-5" /> Тема оформления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                  theme === opt.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent bg-muted/50 hover:bg-muted',
                )}
              >
                <opt.icon className={cn('h-6 w-6', theme === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium', theme === opt.value ? 'text-primary' : 'text-muted-foreground')}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5" /> Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'deadlines' as const, label: 'Напоминания о дедлайнах', desc: 'За 24 часа и 1 час до срока' },
            { key: 'materials' as const, label: 'Новые материалы', desc: 'По вашим курсам' },
            { key: 'friends' as const, label: 'Активность друзей', desc: 'Когда друзья загружают материалы или пишут отзывы' },
            { key: 'forum' as const, label: 'Ответы на форуме', desc: 'На ваши вопросы и ответы' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={() => toggleNotification(item.key)}
                disabled={settingsMutation.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" /> Конфиденциальность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'showEmail' as const, label: 'Показывать email' },
            { key: 'showPhone' as const, label: 'Показывать контакты' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm font-medium">{item.label}</Label>
              <Switch
                checked={privacy[item.key]}
                onCheckedChange={() => togglePrivacy(item.key)}
                disabled={settingsMutation.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-5 w-5" /> Язык
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border bg-muted/50 p-3 text-center text-sm font-medium text-foreground">
              Русский
            </div>
            <p className="text-xs text-muted-foreground">Интерфейс доступен только на русском языке</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Опасная зона</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={async () => {
              try { await authService.logout() } catch { /* ignore */ }
              logout()
              toast({ title: 'Вы вышли из аккаунта', variant: 'success' })
              navigate(ROUTES.LOGIN)
            }}
          >
            <LogOut className="h-4 w-4" /> Выйти из аккаунта
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={(v) => { setDeleteDialogOpen(v); setDeleteConfirmText('') }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Удалить аккаунт
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Удаление аккаунта
                </DialogTitle>
                <DialogDescription>
                  Это действие необратимо. Все ваши данные будут удалены.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Это действие необратимо. Все ваши данные, материалы, отзывы и
                  активность будут удалены. Для подтверждения введите{' '}
                  <span className="font-semibold text-foreground">УДАЛИТЬ</span>.
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Введите УДАЛИТЬ"
                />
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={deleteConfirmText !== 'УДАЛИТЬ' || isDeleting}
                  onClick={async () => {
                    setIsDeleting(true)
                    try {
                      await authService.deleteAccount()
                      logout()
                      toast({ title: 'Аккаунт удалён', description: 'Все данные будут удалены', variant: 'success' })
                      setDeleteDialogOpen(false)
                      navigate(ROUTES.LOGIN)
                    } catch {
                      toast({ title: 'Ошибка', description: 'Не удалось удалить аккаунт', variant: 'error' })
                    } finally {
                      setIsDeleting(false)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Подтвердить удаление
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </PageTransition>
  )
}
