import { beforeEach, describe, expect, it, mock } from "bun:test";

// DB-free: Prisma, Lucia, MinIO and Loki are faked; the real /v3 route tree runs via app.handle(),
// so named-plugin dedup across controllers behaves exactly as in production.
let role: string | null = null;
const create = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "post-1", ...data }));
const remove = mock(async () => ({ id: "post-1" }));

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    blogPost: { create, delete: remove },
    project: { delete: async () => ({ id: "p1" }) },
    user: { count: async () => 42 },
  },
}));
mock.module("@/libs/luciaAuth", () => ({
  lucia: {
    sessionCookieName: "auth_session",
    readBearerToken: (h: string) => (h.startsWith("Bearer ") ? h.slice(7) : null),
    readSessionCookie: () => null,
    validateSession: async () => ({ user: role ? { id: "u1", role } : null, session: role ? {} : null }),
    createBlankSessionCookie: () => ({ value: "", attributes: {} }),
  },
}));
mock.module("@/libs/minioClient", () => ({ default: {} }));
mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

const { default: apiRoutes } = await import("@/api");

const postBlog = () =>
  apiRoutes.handle(
    new Request("http://localhost/v3/blog", {
      method: "POST",
      headers: { authorization: "Bearer s", "content-type": "application/json" },
      body: JSON.stringify({ title: "T", slug: "t", description: "D", content: "C" }),
    })
  );

const deleteBlog = () =>
  apiRoutes.handle(
    new Request("http://localhost/v3/blog/post-1", { method: "DELETE", headers: { authorization: "Bearer s" } })
  );

describe("adminGuard on admin writes", () => {
  beforeEach(() => {
    role = null;
    create.mockClear();
    remove.mockClear();
  });

  it("rejects a signed-in USER with 403", async () => {
    role = "USER";
    expect((await postBlog()).status).toBe(403);
    expect((await deleteBlog()).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("lets an ADMIN through", async () => {
    role = "ADMIN";
    for (const res of [await postBlog(), await deleteBlog()]) {
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    }
    expect(create).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("rejects an anonymous caller with 401", async () => {
    const res = await postBlog();
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("DELETE /v3/project/:id", () => {
  const del = (id: string) =>
    apiRoutes.handle(new Request(`http://localhost/v3/project/${id}`, { method: "DELETE", headers: { authorization: "Bearer s" } }));

  it("needs no request body and validates the id", async () => {
    role = "ADMIN";
    expect((await del("p1")).status).toBe(200);
    expect((await del("x".repeat(65))).status).toBe(422);
  });
});

describe("GET /v3/user/count", () => {
  const count = () =>
    apiRoutes.handle(new Request("http://localhost/v3/user/count", { headers: { authorization: "Bearer s" } }));

  it("is admin only and returns the total", async () => {
    role = "USER";
    expect((await count()).status).toBe(403);
    role = "ADMIN";
    const res = await count();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 200, data: { total: 42 } });
  });
});
