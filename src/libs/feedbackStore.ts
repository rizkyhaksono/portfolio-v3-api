import { createHash } from "node:crypto";
import { prismaClient } from "@/libs/prismaDatabase";

/**
 * Raw-SQL store for visitor feedback / suggestions (admin-reviewable). Same lazy CREATE-TABLE
 * pattern as trackerStore. IPs are hashed, never stored raw.
 */

export type FeedbackCategory = "suggestion" | "bug" | "general";
export type FeedbackStatus = "new" | "read" | "archived";
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ["suggestion", "bug", "general"];
export const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "read", "archived"];

const SALT = process.env.IP_HASH_SALT ?? "portfolio-v3-feedback";

export interface Feedback {
  id: string;
  message: string;
  category: FeedbackCategory;
  email: string | null;
  pageUrl: string | null;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${SALT}`).digest("hex");
}

let ensured = false;
async function ensureTable(): Promise<void> {
  if (ensured) return;
  await prismaClient.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Feedback" (
      "id" TEXT PRIMARY KEY,
      "message" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "email" TEXT,
      "page_url" TEXT,
      "ip_hash" TEXT,
      "status" TEXT NOT NULL DEFAULT 'new',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now()
    );
  `);
  ensured = true;
}

function rowToFeedback(r: Record<string, unknown>): Feedback {
  return {
    id: r.id as string,
    message: r.message as string,
    category: (r.category as FeedbackCategory) ?? "general",
    email: (r.email as string) ?? null,
    pageUrl: (r.page_url as string) ?? null,
    status: (r.status as FeedbackStatus) ?? "new",
    createdAt: r.created_at as Date,
    updatedAt: r.updated_at as Date,
  };
}

export async function createFeedback(input: {
  message: string;
  category: FeedbackCategory;
  email: string | null;
  pageUrl: string | null;
  ip: string;
}): Promise<Feedback> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "Feedback" ("id","message","category","email","page_url","ip_hash","created_at","updated_at")
     VALUES ($1,$2,$3,$4,$5,$6, now(), now())
     RETURNING *`,
    crypto.randomUUID(),
    input.message,
    input.category,
    input.email,
    input.pageUrl,
    hashIp(input.ip)
  );
  return rowToFeedback(rows[0]!);
}

export async function listFeedback(opts: { status?: FeedbackStatus; page?: number; limit?: number }): Promise<{ items: Feedback[]; total: number }> {
  await ensureTable();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const skip = (page - 1) * limit;

  if (opts.status) {
    const [items, total] = await Promise.all([
      prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM "Feedback" WHERE "status" = $1 ORDER BY "created_at" DESC LIMIT $2 OFFSET $3`,
        opts.status,
        limit,
        skip
      ),
      prismaClient.$queryRawUnsafe<{ c: number }[]>(`SELECT COUNT(*)::int AS c FROM "Feedback" WHERE "status" = $1`, opts.status),
    ]);
    return { items: items.map(rowToFeedback), total: total[0]?.c ?? 0 };
  }

  const [items, total] = await Promise.all([
    prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "Feedback" ORDER BY "created_at" DESC LIMIT $1 OFFSET $2`, limit, skip),
    prismaClient.$queryRawUnsafe<{ c: number }[]>(`SELECT COUNT(*)::int AS c FROM "Feedback"`),
  ]);
  return { items: items.map(rowToFeedback), total: total[0]?.c ?? 0 };
}

export async function updateStatus(id: string, status: FeedbackStatus): Promise<Feedback | null> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "Feedback" SET "status" = $2, "updated_at" = now() WHERE "id" = $1 RETURNING *`,
    id,
    status
  );
  return rows[0] ? rowToFeedback(rows[0]) : null;
}
