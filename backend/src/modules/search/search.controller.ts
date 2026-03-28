import type { FastifyRequest, FastifyReply } from 'fastify';
import { success } from '../../utils/api-response.js';
import { unifiedSearch } from './search.service.js';

interface SearchQuery {
  q?: string;
  limit?: string;
}

export async function searchHandler(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const query = (request.query.q ?? '').trim();
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50);

  const result = await unifiedSearch(query, limit);
  return reply.send(success(result));
}
