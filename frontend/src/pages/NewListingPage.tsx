import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'
import { marketplaceService } from '@/services/marketplace.service'

const listingTypes = [
  { value: 'sell', label: 'Продажа' },
  { value: 'buy', label: 'Покупка' },
  { value: 'exchange', label: 'Обмен' },
  { value: 'free', label: 'Бесплатно' },
] as const

const conditionOptions = [
  { value: 'отличное', label: 'Отличное' },
  { value: 'хорошее', label: 'Хорошее' },
  { value: 'нормальное', label: 'Нормальное' },
  { value: 'потрёпанное', label: 'Потрёпанное' },
] as const

const listingSchema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').max(120, 'Максимум 120 символов'),
  type: z.enum(['sell', 'buy', 'exchange', 'free']),
  price: z.coerce.number().min(0, 'Цена не может быть отрицательной').optional(),
  condition: z.enum(['отличное', 'хорошее', 'нормальное', 'потрёпанное']).optional(),
  description: z.string().min(10, 'Минимум 10 символов').max(2000, 'Максимум 2000 символов'),
  course: z.string().optional(),
  location: z.string().optional(),
})

type ListingFormValues = z.infer<typeof listingSchema>

export function NewListingPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [previews, setPreviews] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: { type: 'sell', price: 0 },
  })

  const listingType = watch('type')

  const { mutate, isPending } = useMutation({
    mutationFn: (values: ListingFormValues) =>
      marketplaceService.createListing(
        {
          title: values.title,
          description: values.description,
          price: values.type === 'sell' ? (values.price ?? 0) : 0,
          type: values.type,
          condition: values.condition,
          location: values.location,
          course: values.course ? { title: values.course } : undefined,
        },
        files,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      toast({ title: 'Объявление опубликовано', variant: 'success' })
      navigate(ROUTES.MARKETPLACE)
    },
    onError: (err) => {
      toast({ title: 'Ошибка при публикации', description: err instanceof Error ? err.message : undefined, variant: 'error' })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const incoming = Array.from(selected).slice(0, 5 - files.length)
    const newFiles = [...files, ...incoming]
    setFiles(newFiles)
    incoming.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPreviews((prev) => [...prev, ev.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (values: ListingFormValues) => {
    mutate(values)
  }

  return (
    <PageTransition>
      <Breadcrumbs current="Новое объявление" className="mb-4" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Назад">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Новое объявление</h1>
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Заполните информацию</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  placeholder="Математический анализ, Зорич, том 1"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Тип</Label>
                <Select
                  value={listingType}
                  onValueChange={(v) => setValue('type', v as ListingFormValues['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {listingTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {listingType === 'sell' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="price">Цена (₽)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    placeholder="500"
                    {...register('price')}
                  />
                  {errors.price && (
                    <p className="text-xs text-destructive">{errors.price.message}</p>
                  )}
                </motion.div>
              )}

              {listingType !== 'buy' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label>Состояние</Label>
                  <Select
                    value={watch('condition') ?? ''}
                    onValueChange={(v) =>
                      setValue('condition', v as ListingFormValues['condition'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите состояние" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Опишите учебник подробнее..."
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Курс (необязательно)</Label>
                <Input id="course" placeholder="Математический анализ" {...register('course')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Местоположение</Label>
                <Input id="location" placeholder="КубГТУ, корпус 3" {...register('location')} />
              </div>

              <div className="space-y-2">
                <Label>Фотографии (до 5)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {previews.map((src, i) => (
                    <div key={src.slice(-20)} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        title="Удалить фото"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {files.length < 5 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="mt-1 text-xs text-muted-foreground">Фото</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Публикация...' : 'Опубликовать'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
