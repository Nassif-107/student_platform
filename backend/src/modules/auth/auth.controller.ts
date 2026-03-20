import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error } from '../../utils/api-response.js';
import * as authService from './auth.service.js';
import { AuthError } from './auth.service.js';
import { UserModel } from '../users/users.model.js';

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  universityId: string;
  faculty: string;
  specialization: string;
  year: number;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  newPassword: string;
}

interface VerifyEmailQuery {
  token: string;
}

const AUTH_ERROR_STATUS: Record<string, number> = {
  DUPLICATE_EMAIL: 409,
  INVALID_CREDENTIALS: 401,
  INVALID_REFRESH: 401,
  SESSION_EXPIRED: 401,
  USER_NOT_FOUND: 401,
  TOKEN_GENERATION_FAILED: 500,
  INVALID_VERIFY_TOKEN: 400,
  ALREADY_VERIFIED: 400,
  INVALID_RESET_TOKEN: 400,
};

function handleAuthError(err: unknown, reply: FastifyReply): void {
  if (err instanceof AuthError) {
    const status = AUTH_ERROR_STATUS[err.code] ?? 400;
    reply.status(status).send(error(err.code, err.message));
    return;
  }
  throw err;
}

export async function register(
  req: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { firstName, lastName, patronymic, universityId, ...rest } = req.body;
    const result = await authService.register({
      ...rest,
      name: { first: firstName, last: lastName, patronymic },
      university: { name: universityId },
    });
    return reply.status(201).send(success(result));
  } catch (err) {
    handleAuthError(err, reply);
  }
}

export async function login(
  req: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    return reply.send(success(result));
  } catch (err) {
    handleAuthError(err, reply);
  }
}

export async function refresh(
  req: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);
    return reply.send(success(tokens));
  } catch (err) {
    handleAuthError(err, reply);
  }
}

export async function logout(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = req.user as { id: string; tokenId?: string };
  const tokenId = user.tokenId ?? '';

  await authService.logout(user.id, tokenId);
  return reply.send(success({ message: 'Вы вышли из системы' }));
}

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await UserModel.findById(request.user.id).select('-passwordHash').lean();
  if (!user) {
    return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
  }
  reply.send(success(user));
}

// ---------- Email Verification ----------

export async function verifyEmail(
  req: FastifyRequest<{ Querystring: VerifyEmailQuery }>,
  reply: FastifyReply
): Promise<void> {
  try {
    await authService.verifyEmail(req.query.token);
    return reply.send(success({ message: 'Email успешно подтверждён' }));
  } catch (err) {
    handleAuthError(err, reply);
  }
}

export async function resendVerification(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = await UserModel.findById(req.user.id).lean();
    if (!user) {
      return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
    }
    if (user.emailVerified) {
      return reply.status(400).send(error('ALREADY_VERIFIED', 'Email уже подтверждён'));
    }
    await authService.sendVerificationEmail(user._id.toString(), user.email);
    return reply.send(success({ message: 'Письмо для подтверждения отправлено повторно' }));
  } catch (err) {
    handleAuthError(err, reply);
  }
}

// ---------- Password Reset ----------

export async function forgotPassword(
  req: FastifyRequest<{ Body: ForgotPasswordBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    await authService.requestPasswordReset(req.body.email);
    // Always return success for security
    return reply.send(
      success({ message: 'Если аккаунт с таким email существует, письмо для сброса пароля отправлено' })
    );
  } catch (err) {
    handleAuthError(err, reply);
  }
}

export async function resetPassword(
  req: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return reply.send(success({ message: 'Пароль успешно изменён. Войдите с новым паролем.' }));
  } catch (err) {
    handleAuthError(err, reply);
  }
}
