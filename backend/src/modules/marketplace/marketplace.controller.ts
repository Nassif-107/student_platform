import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getListings,
  createListing,
  updateListingStatus,
  getListingById,
  deleteListing,
  toggleListingActive,
  contactSeller,
} from './marketplace.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { success, error, paginated } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';
import { UserModel } from '../users/users.model.js';

interface ListingsQuerystring {
  type?: string;
  courseId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface IdParams {
  id: string;
}

interface CreateListingBody {
  title: string;
  type: string;
  price?: number;
  condition?: string;
  photos?: string[];
  description?: string;
  course?: { id?: string; title?: string };
  location?: string;
}

interface UpdateStatusBody {
  status: string;
}

export async function listListings(
  request: FastifyRequest<{ Querystring: ListingsQuerystring }>,
  reply: FastifyReply
) {
  const result = await getListings(request.query);
  return reply.send(paginated(result.items, result.total, result.page, result.limit));
}

export async function createListingHandler(
  request: FastifyRequest<{ Body: CreateListingBody }>,
  reply: FastifyReply
) {
  const user = request.user;

  const dbUser = await UserModel.findById(user.id).select('name').lean();
  const sellerName = dbUser ? formatFullName(dbUser.name) : user.email;

  const listing = await createListing(request.body, {
    id: user.id,
    name: sellerName,
  });

  return reply.status(201).send(success(listing));
}

export async function updateListingStatusHandler(
  request: FastifyRequest<{ Params: IdParams; Body: UpdateStatusBody }>,
  reply: FastifyReply
) {
  const user = request.user;

  const listing = await updateListingStatus(
    request.params.id,
    request.body.status,
    user.id
  );
  return reply.send(success(listing));
}

// ---------- GET /marketplace/:id ----------

export async function getListingHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const listing = await getListingById(request.params.id);

  if (!listing) {
    return reply.status(404).send(error('NOT_FOUND', 'Объявление не найдено'));
  }

  return reply.send(success(listing));
}

// ---------- DELETE /marketplace/:id ----------

export async function deleteListingHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  await deleteListing(request.params.id, request.user.id);
  return reply.send(success({ deleted: true }));
}

// ---------- POST /marketplace/:id/toggle ----------

export async function toggleListingHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const listing = await toggleListingActive(request.params.id, request.user.id);
  return reply.send(success(listing));
}

// ---------- POST /marketplace/:id/contact ----------

export async function contactSellerHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const user = request.user;
  const result = await contactSeller(request.params.id, user.id, user.email);

  await createNotification(
    result.sellerId,
    'FRIEND_ACTIVITY',
    'Новое сообщение по объявлению',
    `Пользователь ${result.buyerName} заинтересован в "${result.listingTitle}"`,
    `/marketplace/${request.params.id}`
  );

  return reply.send(success({ contacted: true }));
}
