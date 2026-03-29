import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Upload,
  X,
  Loader2,
  Plus,
  File,
  Image,
  Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { materialsService } from '@/services/materials.service'
import { coursesService } from '@/services/courses.service'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES, MAX_FILE_SIZE, ACCEPTED_FILE_EXTENSIONS } from '@/lib/constants'
import { cn } from '@/lib/cn'

const materialTypes = [
  { value: 'конспект', label: 'Конспект' },
  { value: 'лабораторная', label: 'Лабораторная' },
  { value: 'шпаргалка', label: 'Шпаргалка' },
  { value: 'экзамен', label: 'Экзамен' },
  { value: 'презентация', label: 'Презентация' },
  { value: 'другое', label: 'Другое' },
] as const

interface UploadFormData {
  title: string
  description: string
  type: string
  courseId: string
  tags: string[]
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image
  if (['zip', 'rar', '7z'].includes(ext)) return Archive
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function MaterialUploadPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [tagInput, setTagInput] = useState('')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UploadFormData>({
    defaultValues: {
      title: '',
      description: '',
      type: 'конспект',
      courseId: '',
      tags: [],
    },
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => coursesService.getCourses({ limit: 100 }),
  })

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      // Find the selected course to include title and code
      const selectedCourse = courses?.items?.find((c: { id: string }) => c.id === data.courseId)

      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description || '')
      formData.append('type', data.type)
      formData.append('courseId', data.courseId)
      formData.append('courseTitle', (selectedCourse as any)?.name ?? '')
      formData.append('courseCode', (selectedCourse as any)?.code ?? '')
      if (data.tags.length > 0) formData.append('tags', JSON.stringify(data.tags))
      files.forEach((file) => formData.append('files', file))
      return materialsService.uploadMaterial(formData)
    },
    onSuccess: (result) => {
      toast({ title: 'Материал загружен!', variant: 'success' })
      navigate(ROUTES.MATERIAL_DETAIL(result.id))
    },
    onError: (error) => {
      toast({
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Попробуйте позже',
        variant: 'error',
      })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const valid = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name} слишком большой (макс 10 МБ)`, variant: 'error' })
        return false
      }
      return true
    })
    setFiles((prev) => [...prev, ...valid])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <PageTransition>
      <Breadcrumbs current="Загрузить материал" className="mb-4" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Upload className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Загрузка материала
          </h1>
        </div>

        <form
          onSubmit={handleSubmit((data) => uploadMutation.mutate(data))}
          className="space-y-6"
        >
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  placeholder="Конспект лекций по математическому анализу"
                  {...register('title', { required: 'Укажите название' })}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Полный конспект за семестр с формулами и примерами..."
                  rows={4}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label>Тип материала *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {materialTypes.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => field.onChange(t.value)}
                          className={cn(
                            'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                            field.value === t.value
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border text-muted-foreground hover:bg-accent',
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseId">Курс *</Label>
                <select
                  id="courseId"
                  {...register('courseId', { required: 'Выберите курс' })}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Выберите курс</option>
                  {courses?.items?.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.courseId && (
                  <p className="text-xs text-destructive">{errors.courseId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Файлы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Нажмите для выбора файлов
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, PPT, TXT, ZIP — до 10 МБ
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, i) => {
                    const FileIcon = getFileIcon(file.name)
                    return (
                      <motion.div
                        key={`${file.name}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <FileIcon className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          title="Удалить файл"
                          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Теги</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {field.value.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            title="Удалить тег"
                            onClick={() =>
                              field.onChange(field.value.filter((t) => t !== tag))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Добавьте тег и нажмите Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const tag = tagInput.trim()
                            if (tag && !field.value.includes(tag)) {
                              field.onChange([...field.value, tag])
                              setTagInput('')
                            }
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={uploadMutation.isPending || files.length === 0}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Загрузить материал
          </Button>
        </form>
      </div>
    </PageTransition>
  )
}
