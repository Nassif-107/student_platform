import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { getRedis } from '../../config/redis.js';
import { sendEmail } from '../../utils/email.js';
import { logger } from '../../utils/logger.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { UserModel, type UserDocument } from '../users/users.model.js';
import { createStudentNode } from '../users/users.graph.js';

const BCRYPT_ROUNDS = 12;

/** Parse duration strings like "7d", "15m", "24h" to seconds */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 604800; // fallback: 7 days
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 86400);
}

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: Omit<UserDocument, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

interface RefreshPayload {
  id: string;
  tokenId: string;
}

// ---------- Register ----------

export async function register(data: {
  email: string;
  password: string;
  name: { first: string; last: string; patronymic?: string };
  university: { id?: string; name: string };
  faculty: string;
  specialization: string;
  year: number;
}): Promise<AuthResult> {
  const existing = await UserModel.findOne({ email: data.email }).lean();
  if (existing) {
    throw new AuthError('Пользователь с таким email уже существует', 'DUPLICATE_EMAIL');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await UserModel.create({
    email: data.email,
    passwordHash,
    name: data.name,
    university: data.university,
    faculty: data.faculty,
    specialization: data.specialization,
    year: data.year,
  });

  await createStudentNode(user);

  const tokens = await generateTokens(user);

  trackActivity(
    'user_activity',
    { university: user.university.name, faculty: user.faculty, action: 'register' },
    { userId: user._id.toString() }
  );

  const userObj = user.toObject();
  const { passwordHash: _pw, ...userWithoutPassword } = userObj;

  // Non-blocking: send verification email after registration
  sendVerificationEmail(user._id.toString(), user.email).catch((err) => {
    logger.error('[Auth] Failed to send verification email:', err);
  });

  return { user: userWithoutPassword as unknown as AuthResult['user'], ...tokens };
}

// ---------- Login ----------

export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new AuthError('Неверный email или пароль', 'INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError('Неверный email или пароль', 'INVALID_CREDENTIALS');
  }

  const tokens = await generateTokens(user);

  trackActivity(
    'user_activity',
    { university: user.university.name, faculty: user.faculty, action: 'login' },
    { userId: user._id.toString() }
  );

  await UserModel.updateOne(
    { _id: user._id },
    { $set: { lastActiveAt: new Date() } }
  );

  const userObj = user.toObject();
  const { passwordHash: _pw, ...userWithoutPassword } = userObj;

  return { user: userWithoutPassword as unknown as AuthResult['user'], ...tokens };
}

// ---------- Refresh ----------

export async function refresh(refreshToken: string): Promise<TokenPair> {
  let payload: RefreshPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_SECRET) as RefreshPayload;
  } catch {
    throw new AuthError('Невалидный refresh-токен', 'INVALID_REFRESH');
  }

  const redis = await getRedis();
  const sessionKey = `session:${payload.id}:${payload.tokenId}`;

  const storedHash = await redis.get(sessionKey);
  if (!storedHash) {
    throw new AuthError('Сессия не найдена или токен отозван', 'SESSION_EXPIRED');
  }

  const tokenHash = hashToken(refreshToken);
  if (storedHash !== tokenHash) {
    throw new AuthError('Невалидный refresh-токен', 'INVALID_REFRESH');
  }

  await redis.del(sessionKey);

  const user = await UserModel.findById(payload.id).lean();
  if (!user) {
    throw new AuthError('Пользователь не найден', 'USER_NOT_FOUND');
  }

  return generateTokens(user as unknown as UserDocument);
}

// ---------- Logout ----------

export async function logout(userId: string, tokenId: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(`session:${userId}:${tokenId}`);

  trackActivity(
    'user_activity',
    { action: 'logout' },
    { userId }
  );
}

// ---------- Email Verification ----------

const VERIFY_EMAIL_TTL = 86400; // 24 hours
const VERIFY_EMAIL_PREFIX = 'email_verify:';

export async function sendVerificationEmail(
  userId: string,
  email: string
): Promise<void> {
  const token = crypto.randomUUID();
  const redis = await getRedis();

  await redis.set(`${VERIFY_EMAIL_PREFIX}${token}`, userId, 'EX', VERIFY_EMAIL_TTL);

  const verifyUrl = `${env.CORS_ORIGIN}/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Подтверждение электронной почты — Student Platform',
    html: `
      <h2>Подтверждение email</h2>
      <p>Здравствуйте! Для подтверждения вашей электронной почты перейдите по ссылке:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>Ссылка действительна 24 часа.</p>
    `,
  });

  logger.info(`[Auth] Verification email sent to ${email}`);
}

export async function verifyEmail(token: string): Promise<void> {
  const redis = await getRedis();
  const key = `${VERIFY_EMAIL_PREFIX}${token}`;

  const userId = await redis.get(key);
  if (!userId) {
    throw new AuthError(
      'Ссылка для подтверждения недействительна или истекла',
      'INVALID_VERIFY_TOKEN'
    );
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError('Пользователь не найден', 'USER_NOT_FOUND');
  }

  if (user.emailVerified) {
    await redis.del(key);
    throw new AuthError('Email уже подтверждён', 'ALREADY_VERIFIED');
  }

  await UserModel.updateOne({ _id: userId }, { $set: { emailVerified: true } });
  await redis.del(key);

  logger.info(`[Auth] Email verified for user ${userId}`);
}

// ---------- Password Reset ----------

const RESET_PASSWORD_TTL = 3600; // 1 hour
const RESET_PASSWORD_PREFIX = 'password_reset:';

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await UserModel.findOne({ email }).lean();

  // Always return success for security — do not reveal whether the email exists
  if (!user) {
    logger.debug(`[Auth] Password reset requested for non-existent email: ${email}`);
    return;
  }

  const token = crypto.randomUUID();
  const redis = await getRedis();

  await redis.set(
    `${RESET_PASSWORD_PREFIX}${token}`,
    user._id.toString(),
    'EX',
    RESET_PASSWORD_TTL
  );

  const resetUrl = `${env.CORS_ORIGIN}/auth/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Сброс пароля — Student Platform',
    html: `
      <h2>Сброс пароля</h2>
      <p>Вы запросили сброс пароля. Перейдите по ссылке ниже для установки нового пароля:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
    `,
  });

  logger.info(`[Auth] Password reset email sent to ${email}`);
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const redis = await getRedis();
  const key = `${RESET_PASSWORD_PREFIX}${token}`;

  const userId = await redis.get(key);
  if (!userId) {
    throw new AuthError(
      'Ссылка для сброса пароля недействительна или истекла',
      'INVALID_RESET_TOKEN'
    );
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError('Пользователь не найден', 'USER_NOT_FOUND');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await UserModel.updateOne({ _id: userId }, { $set: { passwordHash } });

  // Delete the reset token
  await redis.del(key);

  // Invalidate all user sessions (force re-login)
  const sessionKeys = await redis.keys(`session:${userId}:*`);
  if (sessionKeys.length > 0) {
    await redis.del(...sessionKeys);
  }

  logger.info(`[Auth] Password reset completed for user ${userId}`);
}

// ---------- Helpers ----------

async function generateTokens(user: UserDocument): Promise<TokenPair> {
  const tokenId = crypto.randomUUID();

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role } satisfies TokenPayload,
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as string & jwt.SignOptions['expiresIn'] }
    );

    refreshToken = jwt.sign(
      { id: user._id.toString(), tokenId } satisfies RefreshPayload,
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as string & jwt.SignOptions['expiresIn'] }
    );
  } catch (err) {
    throw new AuthError('Ошибка генерации токена', 'TOKEN_GENERATION_FAILED');
  }

  const redis = await getRedis();
  const tokenHash = hashToken(refreshToken);
  await redis.set(
    `session:${user._id.toString()}:${tokenId}`,
    tokenHash,
    'EX',
    parseDurationToSeconds(env.JWT_REFRESH_EXPIRY)
  );

  return { accessToken, refreshToken };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
