import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from "bun:test";
import { Elysia } from "elysia";

// DB-free: Prisma's interactive transaction, Lucia and MinIO are faked; the real handler runs.
type Post = { id: string; userId: string; replyToId: string | null; createdAt: Date; deletedAt: null };
const posts: Post[] = [];
const isolationLevels: string[] = [];
let conflictsLeft = 0;

const tx = {
  publicChatMessage: {
    findFirst: async ({ where }: { where: { userId: string; createdAt: { gte: Date; lt: Date } } }) =>
      posts.find(
        (p) =>
          p.userId === where.userId &&
          p.replyToId === null &&
          p.createdAt >= where.createdAt.gte &&
          p.createdAt < where.createdAt.lt
      ) ?? null,
    create: async ({ data }: { data: { message: string; userId: string; replyToId: string | null } }) => {
      const post = { id: `post-${posts.length + 1}`, ...data, createdAt: new Date(), deletedAt: null };
      posts.push(post);
      return { ...post, user: { id: data.userId, name: "Ann", avatarUrl: null, avatarMinioKey: null, headline: null }, replyTo: null };
    },
  },
};

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    publicChatMessage: { findFirst: async () => ({ id: "parent" }) },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>, opts: { isolationLevel: string }) => {
      isolationLevels.push(opts.isolationLevel);
      if (conflictsLeft-- > 0) throw Object.assign(new Error("write conflict"), { code: "P2034" });
      return fn(tx);
    },
  },
}));
mock.module("@/libs/luciaAuth", () => ({
  lucia: {
    sessionCookieName: "auth_session",
    readBearerToken: (h: string) => (h.startsWith("Bearer ") ? h.slice(7) : null),
    readSessionCookie: () => null,
    validateSession: async () => ({ user: { id: "u1", role: "USER" }, session: {} }),
    createBlankSessionCookie: () => ({ value: "", attributes: {} }),
  },
}));
mock.module("@/libs/minioClient", () => ({ default: {} }));
mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

const { error } = await import("@/utils/errorHandler");
const { default: createPost } = await import("@/api/controller/public-chat/createPost");
const app = new Elysia().use(error).use(createPost);

const post = (body: Record<string, string>) =>
  app.handle(
    new Request("http://localhost/", {
      method: "POST",
      headers: { authorization: "Bearer s", "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

describe("POST /public-chat once per UTC day", () => {
  beforeEach(() => {
    posts.length = 0;
    isolationLevels.length = 0;
    conflictsLeft = 0;
  });
  afterEach(() => setSystemTime());

  it("allows one top-level post per UTC day, replies are unlimited", async () => {
    setSystemTime(Date.UTC(2030, 0, 1, 23, 58));
    expect((await post({ message: "first" })).status).toBe(200);
    expect((await post({ message: "second" })).status).toBe(403);
    expect((await post({ message: "a reply", replyToId: "parent" })).status).toBe(200);

    setSystemTime(Date.UTC(2030, 0, 2, 0, 1));
    expect((await post({ message: "next day" })).status).toBe(200);
    expect(isolationLevels.every((level) => level === "Serializable")).toBe(true);
  });

  it("retries once when Postgres aborts a conflicting transaction", async () => {
    conflictsLeft = 1;
    const res = await post({ message: "racing" });
    expect(res.status).toBe(200);
    expect(isolationLevels).toHaveLength(2);
    expect(posts).toHaveLength(1);

    conflictsLeft = 2;
    expect((await post({ message: "still racing" })).status).toBeGreaterThanOrEqual(500);
  });
});
