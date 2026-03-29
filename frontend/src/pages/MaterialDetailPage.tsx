import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Heart, MessageCircle, User, Loader2, ArrowLeft, Send } from 'lucide-react'
import { materialsService } from '@/services/materials.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { formatDateTime, formatRelative } from '@/lib/format-date'
import { formatNumber } from '@/lib/format-number'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')

  const { data: material, isLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: () => materialsService.getMaterialById(id!),
    enabled: !!id,
  })

  // Track liked state locally since backend detail endpoint doesn't return per-user isLiked
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  // Sync when material data loads
  useEffect(() => {
    if (material) {
      setLiked(material.isLiked ?? false)
      setLikeCount(material.likeCount ?? 0)
    }
  }, [material?.id])

  // Ref to track pre-mutation state for safe revert
  const preMutationLiked = useRef(false)

  const likeMutation = useMutation({
    mutationFn: () => materialsService.likeMaterial(id!),
    onMutate: () => {
      preMutationLiked.current = liked
      setLiked(!liked)
      setLikeCount((prev) => Math.max(0, prev + (liked ? -1 : 1)))
    },
    onSuccess: (result) => {
      const res = result as unknown as { liked: boolean; likeCount: number }
      if (typeof res.liked === 'boolean') setLiked(res.liked)
      if (typeof res.likeCount === 'number') setLikeCount(res.likeCount)
    },
    onError: (err) => {
      // Revert to pre-mutation state
      setLiked(preMutationLiked.current)
      setLikeCount((prev) => Math.max(0, prev + (preMutationLiked.current ? 1 : -1)))
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось оценить материал', variant: 'error' })
    },
  })

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await materialsService.downloadMaterial(id!)
      const url = (res as any)?.url || material?.fileUrl
      if (url) window.open(url, '_blank')
      else throw new Error('no url')
    },
    onError: (err) => {
      if (material?.fileUrl) window.open(material.fileUrl, '_blank')
      else toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось скачать файл', variant: 'error' })
    },
  })

  const commentMutation = useMutation({
    mutationFn: (text: string) => materialsService.addComment(id!, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material', id] })
      setCommentText('')
      toast({ title: 'Комментарий добавлен', variant: 'success' })
    },
    onError: (err) => {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось добавить комментарий', variant: 'error' })
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

        <Link to={ROUTES.PROFILE(material.authorId)} className="mt-4 flex items-center gap-3 group w-fit">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {material.authorName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(material.createdAt)}
            </p>
          </div>
        </Link>

        <div className="mt-6 flex items-center gap-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-destructive text-destructive' : ''}`} />
            {formatNumber(likeCount)}
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

        {/* Comments Section */}
        {(() => {
          const comments = (material as any).comments as Array<{ id: string; text: string; authorId: string; authorName: string; createdAt: string }> | undefined
          const commentTotal = comments?.length ?? material.commentCount ?? 0
          return (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Комментарии ({commentTotal})
          </h2>

          {/* Add comment */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (commentText.trim().length > 0) commentMutation.mutate(commentText.trim())
            }}
            className="flex gap-3 mb-6"
          >
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Написать комментарий..."
              className="flex-1"
            />
            <Button type="submit" disabled={!commentText.trim() || commentMutation.isPending} className="gap-2 shrink-0">
              {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Отправить
            </Button>
          </form>

          {/* Comments list */}
          {!comments?.length ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Комментариев пока нет. Будьте первым!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Link to={ROUTES.PROFILE(c.authorId)}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">{c.authorName?.charAt(0) ?? '?'}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={ROUTES.PROFILE(c.authorId)} className="text-sm font-medium hover:text-primary transition-colors">
                        {c.authorName}
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatRelative(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          )
        })()}
      </div>
    </PageTransition>
  )
}
