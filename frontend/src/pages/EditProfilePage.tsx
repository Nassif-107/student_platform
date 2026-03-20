import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema, type UpdateProfileInput } from '@student-platform/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Camera, Loader2, X, Send, ExternalLink,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { socialService } from '@/services/social.service'
import { ROUTES } from '@/lib/constants'

function TagInput({
  value = [],
  onChange,
  placeholder,
}: {
  value?: string[]
  onChange: (tags: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim()
    if (tag && !value.includes(tag) && value.length < 20) {
      onChange([...value, tag])
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              title="Удалить"
              className="ml-0.5 rounded-full hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  )
}

export function EditProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => socialService.getProfile(user!.id),
    enabled: !!user?.id,
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      bio: profile?.bio ?? '',
      socialLinks: {
        telegram: profile?.socialLinks?.telegram ?? '',
        vk: profile?.socialLinks?.vk ?? '',
        github: profile?.socialLinks?.github ?? '',
      },
      skills: profile?.skills ?? [],
      interests: profile?.interests ?? [],
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => socialService.updateProfile(data),
    onSuccess: (updated) => {
      updateUser(updated)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Профиль обновлён', variant: 'success' })
      navigate(ROUTES.PROFILE(user!.id))
    },
    onError: (error) => {
      toast({
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Попробуйте позже',
        variant: 'error',
      })
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return socialService.updateAvatar(formData)
    },
    onSuccess: (data) => {
      updateUser({ avatarUrl: data.avatarUrl })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Аватар обновлён', variant: 'success' })
    },
    onError: () => {
      setAvatarPreview(null)
      toast({ title: 'Ошибка', description: 'Не удалось обновить аватар', variant: 'error' })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    avatarMutation.mutate(file)
  }

  return (
    <PageTransition className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs current="Редактирование профиля" className="mb-4" />
      <h1 className="text-2xl font-bold">Редактирование профиля</h1>

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        {/* Avatar */}
        <Card>
          <CardContent className="flex items-center gap-6 p-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {(avatarPreview ?? profile?.avatarUrl) && (
                  <AvatarImage src={avatarPreview ?? profile?.avatarUrl} />
                )}
                <AvatarFallback className="text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow" aria-label="Загрузить аватар" title="Загрузить аватар">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader><CardTitle>О себе</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Био</Label>
              <Textarea
                id="bio"
                placeholder="Расскажите о себе..."
                {...register('bio')}
              />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader><CardTitle>Контакты</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Telegram</Label>
              <Input placeholder="@username" {...register('socialLinks.telegram')} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> VK</Label>
              <Input placeholder="vk.com/id" {...register('socialLinks.vk')} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> GitHub</Label>
              <Input placeholder="github.com/username" {...register('socialLinks.github')} />
            </div>
          </CardContent>
        </Card>

        {/* Skills & Interests */}
        <Card>
          <CardHeader><CardTitle>Навыки и интересы</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Навыки</Label>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Введите навык и нажмите Enter"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Интересы</Label>
              <Controller
                name="interests"
                control={control}
                render={({ field }) => (
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Введите интерес и нажмите Enter"
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </Button>
      </form>
    </PageTransition>
  )
}
