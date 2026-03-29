import { type FilterQuery } from 'mongoose';
import { ListingModel, type ListingDocument } from './marketplace.model.js';
import { getCache, setCache, deleteCache, deleteCachePattern, buildCacheKey } from '../../utils/cache.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { ServiceError } from '../../utils/service-error.js';

interface ListingsQuery {
  type?: string;
  courseId?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface CreateListingData {
  title: string;
  type: string;
  price?: number;
  condition?: string;
  photos?: string[];
  description?: string;
  course?: { id?: string; title?: string };
  location?: string;
}

interface SellerInfo {
  id: string;
  name: string;
  university?: string;
}

const CACHE_PREFIX = 'app:cache:marketplace';
const CACHE_TTL = 300; // 5 minutes

export async function getListings(query: ListingsQuery) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  const cacheKey = buildCacheKey('marketplace', 'list', query as Record<string, unknown>);
  const cached = await getCache<{ items: unknown[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;

  const filter: FilterQuery<ListingDocument> = {};

  if (query.type) {
    filter.type = query.type;
  }
  if (query.courseId) {
    filter['course.id'] = query.courseId;
  }
  if (query.sellerId) {
    filter['seller.id'] = query.sellerId;
  }
  if (query.status) {
    filter.status = query.status;
  } else if (!query.sellerId) {
    // Default to active only, unless filtering by seller (show all their listings)
    filter.status = 'active';
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  const [items, total] = await Promise.all([
    ListingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ListingModel.countDocuments(filter),
  ]);

  const result = { items, total, page, limit };
  await setCache(cacheKey, result, CACHE_TTL);

  return result;
}

export async function createListing(data: CreateListingData, seller: SellerInfo) {
  const listing = await ListingModel.create({
    ...data,
    seller: {
      id: seller.id,
      name: seller.name,
      university: seller.university,
    },
  });

  await deleteCachePattern(`${CACHE_PREFIX}:list:*`);

  trackActivity(
    'user_activity',
    { action: 'listing_created', university: seller.university ?? 'unknown' },
    { userId: seller.id, listingId: listing._id.toString(), count: 1 }
  );

  return listing.toObject();
}

// ---------- Get Listing by ID ----------

export async function getListingById(listingId: string) {
  const cacheKey = `${CACHE_PREFIX}:${listingId}`;
  const cached = await getCache<ListingDocument>(cacheKey);
  if (cached) return cached;

  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) return null;

  await setCache(cacheKey, listing, CACHE_TTL);
  return listing;
}

// ---------- Delete Listing ----------

export async function deleteListing(listingId: string, sellerId: string) {
  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) {
    throw new ServiceError('Объявление не найдено', 'NOT_FOUND');
  }

  if (listing.seller.id.toString() !== sellerId) {
    throw new ServiceError('Только автор может удалить объявление', 'FORBIDDEN');
  }

  await ListingModel.findByIdAndDelete(listingId);

  await deleteCache(`${CACHE_PREFIX}:${listingId}`);
  await deleteCachePattern(`${CACHE_PREFIX}:list:*`);

  trackActivity(
    'user_activity',
    { action: 'listing_deleted', university: listing.seller.university ?? 'unknown' },
    { userId: sellerId, listingId, count: 1 }
  );
}

// ---------- Toggle Listing Active Status ----------

export async function toggleListingActive(listingId: string, sellerId: string) {
  const listing = await ListingModel.findById(listingId);
  if (!listing) {
    throw new ServiceError('Объявление не найдено', 'NOT_FOUND');
  }

  if (listing.seller.id.toString() !== sellerId) {
    throw new ServiceError('Только автор может изменить статус объявления', 'FORBIDDEN');
  }

  listing.status = listing.status === 'active' ? 'closed' : 'active';
  await listing.save();

  await deleteCache(`${CACHE_PREFIX}:${listingId}`);
  await deleteCachePattern(`${CACHE_PREFIX}:list:*`);

  trackActivity(
    'user_activity',
    { action: 'listing_toggled', university: listing.seller.university ?? 'unknown' },
    { userId: sellerId, listingId, status: listing.status, count: 1 }
  );

  return listing.toObject();
}

// ---------- Contact Seller ----------

export async function contactSeller(
  listingId: string,
  buyerId: string,
  buyerName: string
) {
  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) {
    throw new ServiceError('Объявление не найдено', 'NOT_FOUND');
  }

  const sellerId = listing.seller.id.toString();
  if (sellerId === buyerId) {
    throw new ServiceError('Нельзя написать самому себе', 'BAD_REQUEST');
  }

  return {
    sellerId,
    listingTitle: listing.title,
    buyerId,
    buyerName,
  };
}

// ---------- Update Listing Status ----------

export async function updateListingStatus(
  listingId: string,
  status: string,
  sellerId: string
) {
  const listing = await ListingModel.findById(listingId);

  if (!listing) {
    throw new ServiceError('Объявление не найдено', 'NOT_FOUND');
  }

  if (listing.seller.id.toString() !== sellerId) {
    throw new ServiceError('Только автор может изменить статус объявления', 'FORBIDDEN');
  }

  listing.status = status as ListingDocument['status'];
  await listing.save();

  await deleteCache(`${CACHE_PREFIX}:${listingId}`);
  await deleteCachePattern(`${CACHE_PREFIX}:list:*`);

  trackActivity(
    'user_activity',
    { action: 'listing_status_changed', university: listing.seller.university ?? 'unknown' },
    { userId: sellerId, listingId, status, count: 1 }
  );

  return listing.toObject();
}
