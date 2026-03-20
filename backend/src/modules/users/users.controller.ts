import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { success, error, paginated } from '../../utils/api-response.js';
import { validateFileType } from '../../utils/file-validation.js';
import { parsePagination } from '../../utils/pagination.js';
import * as usersService from './users.service.js';
import { UserModel } from './users.model.js';

interface IdParams {
  id: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

export async function getUser(
  req: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
): Promise<void> {
  const user = await usersService.getUserById(req.params.id);

  if (!user) {
    return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
  }

  return reply.send(success(user));
}

export async function updateProfile(
  req: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const updated = await usersService.updateProfile(
    req.params.id,
    (req.user as { id: string }).id,
    req.body
  );

  if (!updated) {
    return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
  }

  return reply.send(success(updated));
}

export async function getUserActivity(
  req: FastifyRequest<{ Params: IdParams; Querystring: PaginationQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const result = await usersService.getUserActivity(req.params.id, page, limit);

  return reply.send(paginated(result.items, result.total, page, limit));
}

export async function getUserMaterials(
  req: FastifyRequest<{ Params: IdParams; Querystring: PaginationQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  const result = await usersService.getUserMaterials(req.params.id, page, limit);

  return reply.send(paginated(result.items, result.total, page, limit));
}

export async function getMe(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await usersService.getUserById(req.user.id);
  if (!user) {
    return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
  }
  return reply.send(success(user));
}

export async function updateMe(
  req: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const updated = await usersService.updateProfile(req.user.id, req.user.id, req.body);
  if (!updated) {
    return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
  }
  return reply.send(success(updated));
}

export async function uploadAvatar(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const file = await req.file();
  if (!file) {
    return reply.status(400).send(error('BAD_REQUEST', 'Файл не загружен'));
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return reply.status(400).send(error('BAD_REQUEST', 'Допустимые форматы: JPEG, PNG, WebP'));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of file.file) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (buffer.length > maxSize) {
    return reply.status(400).send(error('BAD_REQUEST', 'Максимальный размер файла — 5 МБ'));
  }

  // Verify actual file content matches declared MIME type (magic bytes check)
  const { valid } = validateFileType(buffer, file.mimetype, allowedMimes);
  if (!valid) {
    return reply.status(400).send(error('BAD_REQUEST', 'Содержимое файла не соответствует заявленному типу'));
  }

  const ext = extname(file.filename).toLowerCase() || '.jpg';
  const safeFilename = `${randomUUID()}${ext}`;
  const avatarPath = join('/uploads/avatars', safeFilename);

  await mkdir(dirname(avatarPath), { recursive: true });
  await writeFile(avatarPath, buffer);

  const updated = await usersService.updateProfile(req.user.id, req.user.id, { avatar: avatarPath });
  if (!updated) {
    return reply.status(404).send(error('NOT_FOUND', 'Пользователь не найден'));
  }

  return reply.send(success({ avatar: avatarPath }));
}

interface SearchQuery {
  q?: string;
  page?: string;
  limit?: string;
}

export async function searchUsers(
  req: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply
): Promise<void> {
  const query = req.query.q ?? '';
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);

  if (!query.trim()) {
    return reply.send(paginated([], 0, page, limit));
  }

  const result = await usersService.searchUsers(query, page, limit);
  return reply.send(paginated(result.items, result.total, page, limit));
}
