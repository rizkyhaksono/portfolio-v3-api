import { createHash } from "node:crypto";
import { prismaClient } from "@/libs/prismaDatabase";

/**
 * Raw-SQL store for anonymous claps on blog posts & projects. Uses the same lazy
 * CREATE-TABLE pattern as trackerStore (Prisma CLI is Defender-blocked here). Per-IP dedupe
 * via a hashed IP (we never store raw IPs).
 */

export type ReactionTarget = "blog" | "project";
export const REACTION_TARGETS: ReactionTarget[] = ["blog", "project"];

const SALT = process.env.IP_HASH_SALT ?? "portfolio-v3-reactions";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${SALT}`).digest("hex");
}

let ensured = false;
async function ensureTable(): Promise<void> {
  if (ensured) return;
  await prismaClient.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Reaction" (
      "id" TEXT PRIMARY KEY,
      "target_type" TEXT NOT NULL,
      "target_id" TEXT NOT NULL,
      "ip_hash" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
      UNIQUE ("target_type", "target_id", "ip_hash")
    );
  `);
  await prismaClient.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Reaction_target_idx" ON "Reaction" ("target_type", "target_id");`
  );
  ensured = true;
}

export async function getCount(type: ReactionTarget, id: string): Promise<number> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*)::int AS c FROM "Reaction" WHERE "target_type" = $1 AND "target_id" = $2`,
    type,
    id
  );
  return rows[0]?.c ?? 0;
}

export async function hasReacted(type: ReactionTarget, id: string, ipHash: string): Promise<boolean> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*)::int AS c FROM "Reaction" WHERE "target_type" = $1 AND "target_id" = $2 AND "ip_hash" = $3`,
    type,
    id,
    ipHash
  );
  return (rows[0]?.c ?? 0) > 0;
}

export async function addReaction(type: ReactionTarget, id: string, ipHash: string): Promise<number> {
  await ensureTable();
  await prismaClient.$executeRawUnsafe(
    `INSERT INTO "Reaction" ("id","target_type","target_id","ip_hash")
     VALUES ($1,$2,$3,$4)
     ON CONFLICT ("target_type","target_id","ip_hash") DO NOTHING`,
    crypto.randomUUID(),
    type,
    id,
    ipHash
  );
  return getCount(type, id);
}

export interface RecentReaction {
  id: string;
  targetType: ReactionTarget;
  targetId: string;
  createdAt: Date;
}

export async function recentReactions(limit: number): Promise<RecentReaction[]> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT "id", "target_type", "target_id", "created_at" FROM "Reaction" ORDER BY "created_at" DESC LIMIT $1`,
    limit
  );
  return rows.map((r) => ({
    id: r.id as string,
    targetType: r.target_type as ReactionTarget,
    targetId: r.target_id as string,
    createdAt: r.created_at as Date,
  }));
}
