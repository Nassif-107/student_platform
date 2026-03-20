import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  patronymic: z.string().optional(),
  universityId: z.string().min(1, 'Введите университет'),
  faculty: z.string().min(1, 'Введите факультет'),
  specialization: z.string().min(1, 'Введите направление'),
  year: z.coerce.number().int().min(1).max(6),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Токен обязателен'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;
