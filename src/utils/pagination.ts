import { z } from "zod";

/**
 * Page-based pagination query schema
 */
export const pageBasedPaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type PageBasedPaginationQuery = z.infer<typeof pageBasedPaginationQuerySchema>;

/**
 * Page-based pagination response interface
 */
export interface PageBasedPaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  prev: number | null;
  next: number | null;
}

/**
 * Create page-based paginated response
 */
export function createPageBasedPaginatedResponse<T>(
  allItems: T[],
  page: number,
  limit: number
): PageBasedPaginatedResponse<T> {
  const total = allItems.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const data = allItems.slice(offset, offset + limit);

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return {
    data,
    page,
    limit,
    total,
    totalPages,
    prev,
    next,
  };
}
