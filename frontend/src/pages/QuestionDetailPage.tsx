import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Eye, ChevronUp, ChevronDown, CheckCircle2, CircleDot,
  MessageSquare, Loader2, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'
import { forumService, type ForumAnswer, type QuestionDetailResponse } from '@/services/forum.service'
import { formatRelative } from '@/lib/format-date'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const answerSchema = z.object({
  body: z.string().min(10, 'Минимум 10 символов'),
})

type AnswerForm = z.infer<typeof answerSchema>
type AnswerSort = 'votes' | 'date'

const container = { show: { transition: { staggerChildren: 0.02 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [answerSort, setAnswerSort] = useState<AnswerSort>('votes')
  const [votingAnswerId, setVotingAnswerId] = useState<string | null>(null)
  const [acceptingAnswerId, setAcceptingAnswerId] = useState<string | null>(null)

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['forum-question', id],
    queryFn: () => forumService.getQuestionById(id!),
    enabled: !!id,
  })

  const question = detail?.question
  const answers = detail?.answers ?? []

  const sortedAnswers = [...answers].sort((a, b) =>
    answerSort === 'votes' ? b.voteCount - a.voteCount
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnswerForm>({
    resolver: zodResolver(answerSchema),
  })

  const answerMutation = useMutation({
    mutationFn: (data: AnswerForm) => forumService.createAnswer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-question', id] })
      reset()
      toast({ title: 'Ответ опубликован', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось опубликовать ответ', variant: 'error' }),
  })

  const voteMutation = useMutation({
    mutationFn: ({ answerId, dir }: { answerId: string; dir: 'up' | 'down' }) =>
      forumService.voteAnswer(id!, answerId, dir),
    onMutate: async ({ answerId, dir }) => {
      setVotingAnswerId(answerId)
      await queryClient.cancelQueries({ queryKey: ['forum-question', id] })
      const previous = queryClient.getQueryData<QuestionDetailResponse>(['forum-question', id])
      queryClient.setQueryData<QuestionDetailResponse>(['forum-question', id], (old) => {
        if (!old) return old
        return {
          ...old,
          answers: old.answers.map((a) => {
            if (a.id !== answerId) return a
            const wasVoted = a.isVoted
            let delta = 0
            let newVote: 'up' | 'down' | null = dir
            if (wasVoted === dir) {
              // Toggling same vote off
              delta = dir === 'up' ? -1 : 1
              newVote = null
            } else if (wasVoted) {
              // Switching vote direction
              delta = dir === 'up' ? 2 : -2
            } else {
              // New vote
              delta = dir === 'up' ? 1 : -1
            }
            return { ...a, voteCount: a.voteCount + delta, isVoted: newVote }
          }),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['forum-question', id], context.previous)
      }
      toast({ title: 'Ошибка', description: _err instanceof Error ? _err.message : 'Не удалось проголосовать', variant: 'error' })
      setVotingAnswerId(null)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-question', id] })
      setVotingAnswerId(null)
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (answerId: string) => forumService.acceptAnswer(id!, answerId),
    onMutate: async (answerId) => {
      setAcceptingAnswerId(answerId)
      await queryClient.cancelQueries({ queryKey: ['forum-question', id] })
      const previous = queryClient.getQueryData<QuestionDetailResponse>(['forum-question', id])
      queryClient.setQueryData<QuestionDetailResponse>(['forum-question', id], (old) => {
        if (!old) return old
        return {
          ...old,
          question: { ...old.question, isSolved: true, acceptedAnswerId: answerId },
          answers: old.answers.map((a) => ({
            ...a,
            isAccepted: a.id === answerId,
          })),
        }
      })
      return { previous }
    },
    onSuccess: () => {
      toast({ title: 'Ответ принят', variant: 'success' })
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['forum-question', id], context.previous)
      }
      toast({ title: 'Ошибка', description: _err instanceof Error ? _err.message : 'Не удалось принять ответ', variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-question', id] })
      setAcceptingAnswerId(null)
    },
  })

  const isAuthor = user?.id === question?.authorId

  if (detailLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </PageTransition>
    )
  }

  if (!question) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-16">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Вопрос не найден</p>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <Breadcrumbs current={question.title} className="mb-4" />
      <div className="mx-auto max-w-3xl space-y-8">
        <Button variant="ghost" onClick={() => navigate(ROUTES.FORUM)}>
          <ArrowLeft className="h-4 w-4" /> Назад к форуму
        </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{question.title}</h1>
          <Badge className={cn('shrink-0', question.isSolved ? 'bg-success/10 text-success border-success/30' : 'bg-info/10 text-info border-info/30')} variant="outline">
            {question.isSolved ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Решён</> : <><CircleDot className="h-3 w-3 mr-1" /> Открыт</>}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{question.viewCount} просмотров</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(question.tags ?? []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
        </div>

        <div className="rounded-xl border bg-card p-5 whitespace-pre-wrap text-sm leading-relaxed">
          {question.body}
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {question.authorAvatarUrl && <AvatarImage src={question.authorAvatarUrl} />}
            <AvatarFallback>{question.authorName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{question.authorName}</p>
            <p className="text-xs text-muted-foreground">{formatRelative(question.createdAt)}</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{answers.length} ответов</h2>
          <Select value={answerSort} onValueChange={(v) => setAnswerSort(v as AnswerSort)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">По голосам</SelectItem>
              <SelectItem value="date">По дате</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {sortedAnswers.map((a: ForumAnswer) => (
            <motion.div key={a.id} variants={item} className={cn('flex gap-4 rounded-xl border bg-card p-5', a.isAccepted && 'border-success/30 bg-success/5')}>
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => voteMutation.mutate({ answerId: a.id, dir: 'up' })} disabled={votingAnswerId === a.id} title="За" className={cn('p-1 rounded hover:bg-accent disabled:opacity-50', a.isVoted === 'up' && 'text-primary')}>
                  <ChevronUp className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold">{a.voteCount}</span>
                <button onClick={() => voteMutation.mutate({ answerId: a.id, dir: 'down' })} disabled={votingAnswerId === a.id} title="Против" className={cn('p-1 rounded hover:bg-accent disabled:opacity-50', a.isVoted === 'down' && 'text-destructive')}>
                  <ChevronDown className="h-5 w-5" />
                </button>
                {a.isAccepted && <Check className="h-5 w-5 text-success mt-1" />}
              </div>
              <div className="flex-1 space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.body}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {a.authorAvatarUrl && <AvatarImage src={a.authorAvatarUrl} />}
                      <AvatarFallback className="text-xs">{a.authorName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{a.authorName}</span>
                    <span className="text-xs text-muted-foreground">{formatRelative(a.createdAt)}</span>
                  </div>
                  {isAuthor && !question.isSolved && !a.isAccepted && (
                    <Button variant="outline" size="sm" onClick={() => acceptMutation.mutate(a.id)} disabled={acceptingAnswerId === a.id}>
                      <Check className="h-3 w-3" /> Принять ответ
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {answers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Пока нет ответов. Будьте первым!</p>
        )}
      </div>

      {user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-semibold">Ваш ответ</h3>
          <form onSubmit={handleSubmit((data) => answerMutation.mutate(data))} className="space-y-3">
            <Textarea placeholder="Ваш ответ..." className="min-h-[120px]" {...register('body')} />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={answerMutation.isPending}>
                {answerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Ответить
              </Button>
            </div>
          </form>
        </motion.div>
      )}
      </div>
    </PageTransition>
  )
}
