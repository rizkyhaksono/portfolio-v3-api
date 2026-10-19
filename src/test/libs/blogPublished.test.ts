import { beforeEach, describe, expect, it, mock } from "bun:test";

// DB-free: Prisma and Lucia are faked, the real blog handlers run via app.handle().
const posts = [
  { slug: "live", published: true },
  { slug: "draft", published: false },
];
const findMany = mock(async ({ where }: { where?: { published: boolean } }) =>
  posts.filter((p) => !where || p.published === where.published)
);
const findUnique = mock(async ({ where }: { where: { slug: string } }) =>
  posts.find((p) => p.slug === where.slug) ?? null
);
let role: string | null = null;

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: { blogPost: { findMany, findUnique } },
}));
mock.module("@/libs/luciaAuth", () => ({
  lucia: {
    sessionCookieName: "auth_session",
    readBearerToken: (h: string) => (h.startsWith("Bearer ") ? h.slice(7) : null),
    readSessionCookie: () => null,
    validateSession: async () => ({ user: role ? { role } : null, session: role ? {} : null }),
  },
}));

const { default: getAllBlog } = await import("@/api/controller/blog/getAllBlog");
const { default: getBlogBySlug } = await import("@/api/controller/blog/getBlogBySlug");

const get = (app: { handle: (r: Request) => Promise<Response> }, path: string, token?: string) =>
  app.handle(new Request(`http://localhost${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : {}));
const slugs = async (res: Response) => ((await res.json()).data as { slug: string }[]).map((p) => p.slug);

describe("public blog routes hide drafts", () => {
  beforeEach(() => {
    role = null;
  });

  it("lists only published posts for anonymous and non-admin callers", async () => {
    expect(await slugs(await get(getAllBlog, "/"))).toEqual(["live"]);
    role = "USER";
    expect(await slugs(await get(getAllBlog, "/", "s"))).toEqual(["live"]);
  });

  it("lists drafts for admins unless publishedOnly=true", async () => {
    role = "ADMIN";
    expect(await slugs(await get(getAllBlog, "/", "s"))).toEqual(["live", "draft"]);
    expect(await slugs(await get(getAllBlog, "/?publishedOnly=true", "s"))).toEqual(["live"]);
  });

  it("404s a draft slug for non-admins, serves it to admins", async () => {
    expect((await get(getBlogBySlug, "/live")).status).toBe(200);
    expect((await get(getBlogBySlug, "/draft")).status).toBe(404);
    role = "USER";
    expect((await get(getBlogBySlug, "/draft", "s")).status).toBe(404);
    role = "ADMIN";
    expect((await get(getBlogBySlug, "/draft", "s")).status).toBe(200);
  });
});
