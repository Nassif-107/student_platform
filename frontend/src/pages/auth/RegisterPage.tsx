import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@student-platform/shared'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, User, GraduationCap, Building2, BookOpen, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const formSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Повторите пароль') })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof formSchema>

const YEAR_OPTIONS = [
  { value: '1', label: '1 курс' },
  { value: '2', label: '2 курс' },
  { value: '3', label: '3 курс' },
  { value: '4', label: '4 курс' },
  { value: '5', label: 'Магистратура' },
  { value: '6', label: 'Аспирантура' },
]

function getStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return score
}

const strengthLabels = ['', 'Слабый', 'Средний', 'Хороший', 'Отличный']
const strengthColors = ['', 'bg-destructive', 'bg-warning', 'bg-warning/70', 'bg-success']

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { register: registerUser } = useAuth()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { year: 1 },
  })

  const passwordValue = watch('password') ?? ''
  const strength = useMemo(() => getStrength(passwordValue), [passwordValue])

  const onSubmit = async (data: FormValues) => {
    try {
      const { confirmPassword: _, ...payload } = data
      await registerUser(payload as RegisterInput)
    } catch (error) {
      toast({
        title: 'Ошибка регистрации',
        description:
          error instanceof Error ? error.message : 'Не удалось создать аккаунт',
        variant: 'error',
      })
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-blue-500/10 px-4 py-8">
      {/* Floating decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="absolute right-1/3 top-1/4 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="glass border-border/40 shadow-xl shadow-primary/5">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl text-gradient">Создайте аккаунт</CardTitle>
            <p className="text-sm text-muted-foreground">
              Присоединяйтесь к студенческому сообществу
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="firstName" placeholder="Иван" className="pl-10" {...register('firstName')} />
                  </div>
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input id="lastName" placeholder="Иванов" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patronymic">Отчество <span className="text-muted-foreground">(необязательно)</span></Label>
                <Input id="patronymic" placeholder="Иванович" {...register('patronymic')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="student@university.ru" className="pl-10" {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordValue.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            i <= strength ? strengthColors[strength] : 'bg-muted',
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strengthLabels[strength]}</p>
                  </div>
                )}
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Повторите пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Повторите пароль"
                    className="pl-10"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="universityId">Университет</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="universityId" placeholder="Введите название университета" className="pl-10" {...register('universityId')} />
                </div>
                {errors.universityId && <p className="text-xs text-destructive">{errors.universityId.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="faculty">Факультет</Label>
                  <Input id="faculty" placeholder="Информатика" {...register('faculty')} />
                  {errors.faculty && <p className="text-xs text-destructive">{errors.faculty.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Направление подготовки</Label>
                  <Input id="specialization" placeholder="Программная инженерия" {...register('specialization')} />
                  {errors.specialization && <p className="text-xs text-destructive">{errors.specialization.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Курс</Label>
                <Select
                  defaultValue="1"
                  onValueChange={(v) => setValue('year', Number(v), { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Выберите курс" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Зарегистрироваться
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
                Войдите
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
