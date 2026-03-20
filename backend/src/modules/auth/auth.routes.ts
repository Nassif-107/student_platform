import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema, refreshSchema } from '@student-platform/shared';
import * as authController from './auth.controller.js';

// ---------- Inline Zod Schemas ----------

const verifyEmailQuerySchema = z.object({
  token: z.string().uuid('Невалидный токен подтверждения'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный email'),
});

const resetPasswordSchema = z.object({
  token: z.string().uuid('Невалидный токен сброса'),
  newPassword: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(128, 'Пароль слишком длинный'),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Stricter rate limiting for auth endpoints: 5 requests per minute
  const authRateLimit = {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  };

  // POST /auth/register
  app.post(
    '/register',
    { ...authRateLimit, preHandler: [validate({ body: registerSchema })] },
    authController.register as RouteHandlerMethod
  );

  // POST /auth/login
  app.post(
    '/login',
    { ...authRateLimit, preHandler: [validate({ body: loginSchema })] },
    authController.login as RouteHandlerMethod
  );

  // POST /auth/refresh
  app.post(
    '/refresh',
    { preHandler: [validate({ body: refreshSchema })] },
    authController.refresh as RouteHandlerMethod
  );

  // POST /auth/logout (authenticated)
  app.post(
    '/logout',
    { preHandler: [authenticate] },
    authController.logout as RouteHandlerMethod
  );

  // GET /auth/me — return authenticated user's profile
  app.get(
    '/me',
    { preHandler: [authenticate] },
    authController.getMe as RouteHandlerMethod
  );

  // ---------- Email Verification ----------

  // GET /auth/verify-email?token=xxx
  app.get(
    '/verify-email',
    { preHandler: [validate({ querystring: verifyEmailQuerySchema })] },
    authController.verifyEmail as RouteHandlerMethod
  );

  // POST /auth/resend-verification (authenticated)
  app.post(
    '/resend-verification',
    { ...authRateLimit, preHandler: [authenticate] },
    authController.resendVerification as RouteHandlerMethod
  );

  // ---------- Password Reset ----------

  // POST /auth/forgot-password
  app.post(
    '/forgot-password',
    { ...authRateLimit, preHandler: [validate({ body: forgotPasswordSchema })] },
    authController.forgotPassword as RouteHandlerMethod
  );

  // POST /auth/reset-password
  app.post(
    '/reset-password',
    { ...authRateLimit, preHandler: [validate({ body: resetPasswordSchema })] },
    authController.resetPassword as RouteHandlerMethod
  );
};
