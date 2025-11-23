import { z } from "zod";

/**
 * Cursor-based pagination utility following Elysia pagination rules
 */
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Encode cursor for pagination (base64 encoded timestamp or id)
 */
export function encodeCursor(value: Date | string | number): string {
  const str = value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(str).toString("base64");
}

/**
 * Decode cursor from base64
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, "base64").toString("utf-8");
  } catch {
    throw new Error("Invalid cursor format");
  }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  limit: number,
  getCursorValue: (item: T) => Date | string | number
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? encodeCursor(getCursorValue(items[limit - 1])) : null;

  return {
    data,
    nextCursor,
    hasMore,
  };
}

/**
 * Parse cursor to Date object (for timestamp-based cursors)
 */
export function parseCursorToDate(cursor?: string): Date | undefined {
  if (!cursor) return undefined;

  try {
    const decoded = decodeCursor(cursor);
    const date = new Date(decoded);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date in cursor");
    }

    return date;
  } catch {
    throw new Error("Invalid cursor format");
  }
}

/**
 * Parse cursor to number (for id-based cursors)
 */
export function parseCursorToNumber(cursor?: string): number | undefined {
  if (!cursor) return undefined;

  try {
    const decoded = decodeCursor(cursor);
    const num = parseInt(decoded, 10);

    if (isNaN(num)) {
      throw new Error("Invalid number in cursor");
    }

    return num;
  } catch {
    throw new Error("Invalid cursor format");
  }
}
