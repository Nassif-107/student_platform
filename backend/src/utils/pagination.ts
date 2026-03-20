export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(
  query: Record<string, unknown>
): PaginationParams {
  let page = Number(query.page);
  let limit = Number(query.limit);

  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  page = Math.floor(page);
  limit = Math.floor(limit);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
