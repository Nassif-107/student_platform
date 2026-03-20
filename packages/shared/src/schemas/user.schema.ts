import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  patronymic: z.string().optional(),
  faculty: z.string().min(1).optional(),
  specialization: z.string().min(1).optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  socialLinks: z
    .object({
      telegram: z.string().optional(),
      vk: z.string().optional(),
      github: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(8, 'Минимум 8 символов'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateNotificationSettingsSchema = z.object({
  deadlines: z.boolean().optional(),
  materials: z.boolean().optional(),
  friends: z.boolean().optional(),
  forum: z.boolean().optional(),
});

export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
