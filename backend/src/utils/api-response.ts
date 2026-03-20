export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export function success<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

export function error(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return response;
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): SuccessResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return success(data, {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  } satisfies PaginatedMeta);
}
