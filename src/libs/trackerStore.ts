import { prismaClient } from "@/libs/prismaDatabase";

/**
 * Raw-SQL store for the Kanban tracker. Deliberately avoids a Prisma model so it
 * works without `prisma generate` / `prisma db push` (which are currently blocked
 * on Windows by a Defender false-positive on the Prisma CLI). The table is created
 * lazily on first use and matches what a Prisma `TrackerTask` model would produce,
 * so a future `prisma db push` is a no-op.
 */

export interface TrackerTask {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  order: number;
  createdById: string | null;
  createdByName: string | null;
  createdByAvatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let ensured = false;
async function ensureTable(): Promise<void> {
  if (ensured) return;
  await prismaClient.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrackerTask" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'todo',
      "priority" TEXT NOT NULL DEFAULT 'medium',
      "type" TEXT NOT NULL DEFAULT 'task',
      "order" DOUBLE PRECISION NOT NULL DEFAULT 1000,
      "created_by_id" TEXT,
      "created_by_name" TEXT,
      "created_by_avatar" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now()
    );
  `);
  ensured = true;
}

function rowToTask(r: Record<string, unknown>): TrackerTask {
  return {
    id: r.id as string,
    key: r.key as string,
    title: r.title as string,
    description: (r.description as string) ?? null,
    status: r.status as string,
    priority: r.priority as string,
    type: r.type as string,
    order: Number(r.order),
    createdById: (r.created_by_id as string) ?? null,
    createdByName: (r.created_by_name as string) ?? null,
    createdByAvatar: (r.created_by_avatar as string) ?? null,
    createdAt: r.created_at as Date,
    updatedAt: r.updated_at as Date,
  };
}

export async function listTasks(): Promise<TrackerTask[]> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrackerTask" ORDER BY "status" ASC, "order" ASC`
  );
  return rows.map(rowToTask);
}

export async function countTasks(): Promise<number> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*)::int AS c FROM "TrackerTask"`
  );
  return rows[0]?.c ?? 0;
}

export async function topOrder(status: string): Promise<number | null> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<{ order: number }[]>(
    `SELECT "order" FROM "TrackerTask" WHERE "status" = $1 ORDER BY "order" ASC LIMIT 1`,
    status
  );
  return rows[0] ? Number(rows[0].order) : null;
}

export async function getTask(id: string): Promise<TrackerTask | null> {
  await ensureTable();
  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrackerTask" WHERE "id" = $1`,
    id
  );
  return rows[0] ? rowToTask(rows[0]) : null;
}

export async function createTask(input: {
  key: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  order: number;
  createdById: string | null;
  createdByName: string | null;
  createdByAvatar: string | null;
}): Promise<TrackerTask> {
  await ensureTable();
  const id = crypto.randomUUID();
  // Set created_at/updated_at explicitly — a Prisma-migrated table's @updatedAt
  // column is NOT NULL with no DB default (Prisma fills it at the app layer).
  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "TrackerTask"
       ("id","key","title","description","status","priority","type","order","created_by_id","created_by_name","created_by_avatar","created_at","updated_at")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now())
     RETURNING *`,
    id,
    input.key,
    input.title,
    input.description,
    input.status,
    input.priority,
    input.type,
    input.order,
    input.createdById,
    input.createdByName,
    input.createdByAvatar
  );
  return rowToTask(rows[0]!);
}

export async function updateTask(
  id: string,
  fields: { title?: string; description?: string | null; status?: string; priority?: string; type?: string; order?: number }
): Promise<TrackerTask | null> {
  await ensureTable();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 2;
  const add = (col: string, val: unknown) => {
    sets.push(`${col} = $${i++}`);
    vals.push(val);
  };
  if (fields.title !== undefined) add('"title"', fields.title);
  if (fields.description !== undefined) add('"description"', fields.description);
  if (fields.status !== undefined) add('"status"', fields.status);
  if (fields.priority !== undefined) add('"priority"', fields.priority);
  if (fields.type !== undefined) add('"type"', fields.type);
  if (fields.order !== undefined) add('"order"', fields.order);
  if (sets.length === 0) return getTask(id);

  const rows = await prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "TrackerTask" SET ${sets.join(", ")}, "updated_at" = now() WHERE "id" = $1 RETURNING *`,
    id,
    ...vals
  );
  return rows[0] ? rowToTask(rows[0]) : null;
}

export async function deleteTask(id: string): Promise<void> {
  await ensureTable();
  await prismaClient.$executeRawUnsafe(`DELETE FROM "TrackerTask" WHERE "id" = $1`, id);
}
