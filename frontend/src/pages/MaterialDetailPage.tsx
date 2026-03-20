import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Heart, MessageCircle, User, Loader2, ArrowLeft } from 'lucide-react'
import { materialsService } from '@/services/materials.service'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/format-date'
import { formatNumber } from '@/lib/format-number'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: material, isLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: () => materialsService.getMaterialById(id!),
    enabled: !!id,
  })

  const likeMutation = useMutation({
    mutationFn: () => materialsService.likeMaterial(id!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['material', id] })
      const previous = queryClient.getQueryData(['material', id])
      queryClient.setQueryData(['material', id], (old: any) => ({
        ...old,
        isLiked: !old?.isLiked,
        likeCount: (old?.likeCount ?? 0) + (old?.isLiked ? -1 : 1),
      }))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['material', id], context.previous)
      }
      toast({ title: 'Ошибка', description: 'Не удалось оценить материал', variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['material', id] })
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await materialsService.downloadMaterial(id!)
      const url = (res as any)?.url || material?.fileUrl
      if (url) window.open(url, '_blank')
      else throw new Error('no url')
    },
    onError: () => {
      if (material?.fileUrl) window.open(material.fileUrl, '_blank')
      else toast({ title: 'Ошибка', description: 'Не удалось скачать файл', variant: 'error' })
    },
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </PageTransition>
    )
  }

  if (!material) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            Материал не найден
          </p>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <Breadcrumbs current={material.title} className="mb-4" />
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.MATERIALS)}>
          <ArrowLeft className="h-4 w-4" /> Назад к материалам
        </Button>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-foreground">
          {material.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{material.description}</p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {material.authorName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(material.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Heart className={`h-4 w-4 ${material.isLiked ? 'fill-destructive text-destructive' : ''}`} />
            {formatNumber(material.likeCount)}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
          >
            {downloadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Скачать ({formatNumber(material.downloadCount)})
          </Button>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            {formatNumber(material.commentCount)} комментариев
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(material.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        </div>
      </div>
    </PageTransition>
  )
}
