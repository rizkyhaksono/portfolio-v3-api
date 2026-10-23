import { beforeEach, describe, expect, it, mock } from "bun:test";

// DB-free: Prisma and Lucia are faked, the real blog handlers run via app.handle().
const posts = [
  { slug: "live", published: true, content: "Live body" },
  { slug: "draft", published: false, content: "Draft body" },
];
type Post = (typeof posts)[number];
const pick = (post: Post, select?: Record<string, boolean>) =>
  select ? Object.fromEntries(Object.keys(select).filter((k) => k in post).map((k) => [k, post[k as keyof Post]])) : post;
const findMany = mock(async ({ where, select }: { where?: { published: boolean }; select?: Record<string, boolean> }) =>
  posts.filter((p) => !where || p.published === where.published).map((p) => pick(p, select))
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

describe("blog list payload and caching", () => {
  beforeEach(() => {
    role = null;
  });

  it("omits content and is publicly cacheable for anonymous callers", async () => {
    const res = await get(getAllBlog, "/");
    expect((await res.json()).data).toEqual([{ slug: "live", published: true }]);
    expect(res.headers.get("cache-control")).toBe("public, max-age=60, stale-while-revalidate=600");
    expect(res.headers.get("vary")).toContain("Authorization, Cookie");
  });

  it("returns full rows with no-store for admins", async () => {
    role = "ADMIN";
    const res = await get(getAllBlog, "/", "s");
    expect((await res.json()).data[0]).toEqual({ slug: "live", published: true, content: "Live body" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
