import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star, Loader2, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { RatingStars } from '@/components/shared/RatingStars'
import { useToast } from '@/components/ui/toast'
import { reviewsService, type CreateReviewData } from '@/services/reviews.service'

const currentSemester = () => {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return month >= 9 ? `Осень ${year}` : `Весна ${year}`
}

const reviewFormSchema = z.object({
  overall: z.number().min(1, 'Выберите оценку').max(10),
  difficulty: z.number().min(1, 'Выберите сложность').max(10),
  usefulness: z.number().min(1, 'Выберите полезность').max(10),
  text: z.string().min(10, 'Минимум 10 символов').max(2000),
  anonymous: z.boolean(),
})

type ReviewFormValues = z.infer<typeof reviewFormSchema>

interface CreateReviewDialogProps {
  targetType: 'course' | 'professor'
  targetId: string
  targetName: string
  /** Query keys to invalidate after review creation */
  invalidateKeys: unknown[][]
  trigger?: React.ReactNode
}

export function CreateReviewDialog({
  targetType,
  targetId,
  targetName,
  invalidateKeys,
  trigger,
}: CreateReviewDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      overall: 0,
      difficulty: 0,
      usefulness: 0,
      text: '',
      anonymous: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: ReviewFormValues) => {
      const data: CreateReviewData = {
        targetType,
        targetId,
        targetName,
        ratings: {
          overall: values.overall,
          difficulty: values.difficulty,
          usefulness: values.usefulness,
        },
        text: values.text,
        semester: currentSemester(),
        anonymous: values.anonymous,
      }
      return reviewsService.createReview(data)
    },
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      toast({ title: 'Отзыв опубликован', variant: 'success' })
      setOpen(false)
      reset()
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Не удалось создать отзыв'
      toast({ title: 'Ошибка', description: message, variant: 'error' })
    },
  })

  const ratingLabel = (val: number) => {
    if (val === 0) return 'Не выбрано'
    if (val <= 3) return `${val}/10 — Низко`
    if (val <= 6) return `${val}/10 — Средне`
    if (val <= 8) return `${val}/10 — Хорошо`
    return `${val}/10 — Отлично`
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Star className="h-4 w-4" /> Написать отзыв
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Отзыв о {targetType === 'course' ? 'курсе' : 'преподавателе'}</DialogTitle>
          <DialogDescription>{targetName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-5">
          {/* Overall Rating */}
          <div className="space-y-2">
            <Label>Общая оценка</Label>
            <Controller
              control={control}
              name="overall"
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <RatingStars
                    value={field.value / 2}
                    max={5}
                    interactive
                    onChange={(v) => field.onChange(v * 2)}
                  />
                  <span className="text-sm text-muted-foreground">{ratingLabel(field.value)}</span>
                </div>
              )}
            />
            {errors.overall && <p className="text-xs text-destructive">{errors.overall.message}</p>}
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Сложность</Label>
            <Controller
              control={control}
              name="difficulty"
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <RatingStars
                    value={field.value / 2}
                    max={5}
                    interactive
                    onChange={(v) => field.onChange(v * 2)}
                  />
                  <span className="text-sm text-muted-foreground">{ratingLabel(field.value)}</span>
                </div>
              )}
            />
            {errors.difficulty && <p className="text-xs text-destructive">{errors.difficulty.message}</p>}
          </div>

          {/* Usefulness */}
          <div className="space-y-2">
            <Label>Полезность</Label>
            <Controller
              control={control}
              name="usefulness"
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <RatingStars
                    value={field.value / 2}
                    max={5}
                    interactive
                    onChange={(v) => field.onChange(v * 2)}
                  />
                  <span className="text-sm text-muted-foreground">{ratingLabel(field.value)}</span>
                </div>
              )}
            />
            {errors.usefulness && <p className="text-xs text-destructive">{errors.usefulness.message}</p>}
          </div>

          {/* Text */}
          <div className="space-y-2">
            <Label>Текст отзыва</Label>
            <Textarea
              rows={4}
              placeholder="Поделитесь вашим опытом..."
              {...register('text')}
            />
            {errors.text && <p className="text-xs text-destructive">{errors.text.message}</p>}
          </div>

          {/* Anonymous */}
          <Controller
            control={control}
            name="anonymous"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Анонимный отзыв</Label>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />

          <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createMutation.isPending ? 'Публикация...' : 'Опубликовать отзыв'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
