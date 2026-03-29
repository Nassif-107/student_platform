import { useState, useRef, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, X, Tag, Paperclip, File, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { forumService } from '@/services/forum.service'
import { coursesService } from '@/services/courses.service'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'

const askQuestionSchema = z.object({
  title: z.string().min(5, 'Минимум 5 символов').max(200, 'Максимум 200 символов'),
  body: z.string().min(20, 'Минимум 20 символов'),
  courseId: z.string().optional(),
})

type AskQuestionForm = z.infer<typeof askQuestionSchema>

export function AskQuestionPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: () => coursesService.getCourses({ limit: 100 }),
  })
  const coursesList = coursesData?.items ?? []

  const {
    register, handleSubmit, setValue, formState: { errors },
  } = useForm<AskQuestionForm>({
    resolver: zodResolver(askQuestionSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: AskQuestionForm) =>
      forumService.createQuestion({
        title: data.title,
        body: data.body,
        courseId: data.courseId,
        tags,
      }, files),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['forum-questions'] })
      toast({ title: 'Вопрос опубликован', description: 'Ваш вопрос успешно создан', variant: 'success' })
      navigate(ROUTES.QUESTION_DETAIL(created.id))
    },
    onError: (err) => {
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось создать вопрос',
        variant: 'error',
      })
    },
  })

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (!tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag])
      }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const onSubmit = (data: AskQuestionForm) => mutate(data)

  return (
    <PageTransition>
      <Breadcrumbs current="Задать вопрос" className="mb-4" />
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(ROUTES.FORUM)}>
          <ArrowLeft className="h-4 w-4" /> Назад к форуму
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Задать вопрос</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  placeholder="Кратко сформулируйте ваш вопрос"
                  maxLength={200}
                  {...register('title')}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Описание</Label>
                <Textarea
                  id="body"
                  placeholder="Опишите ваш вопрос подробно..."
                  className="min-h-[200px]"
                  {...register('body')}
                />
                <p className="text-xs text-muted-foreground">Поддерживается Markdown</p>
                {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Курс <span className="text-muted-foreground">(необязательно)</span></Label>
                <Select onValueChange={(v) => setValue('courseId', v === '__none__' ? undefined : v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите курс" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Без привязки к курсу</SelectItem>
                    {coursesList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Теги <span className="text-muted-foreground">(до 5, нажмите Enter для добавления)</span></Label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input p-2 min-h-[42px]">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} title="Удалить тег" className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length < 5 ? 'Добавить тег...' : ''}
                    disabled={tags.length >= 5}
                    className="flex-1 border-0 p-0 shadow-none focus-visible:ring-0 min-w-[120px]"
                  />
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>Вложения <span className="text-muted-foreground">(необязательно — изображения, PDF)</span></Label>
                <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" onChange={(e) => {
                  const selected = Array.from(e.target.files ?? [])
                  setFiles((prev) => [...prev, ...selected].slice(0, 5))
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <Paperclip className="h-4 w-4" />
                  Прикрепить файлы (макс. 5)
                </button>
                {files.length > 0 && (
                  <div className="space-y-1.5">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                        {f.type.startsWith('image/') ? <Image className="h-4 w-4 text-primary shrink-0" /> : <File className="h-4 w-4 text-primary shrink-0" />}
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} КБ</span>
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="p-0.5 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Опубликовать
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
