import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

// DB-free: Prisma (honouring `select`, so a missing select leaks like the real client),
// Lucia and MinIO are faked; the real /me and /asset handlers run via app.handle().
type Row = Record<string, unknown>;
const users: Record<string, Row> = {
  u1: {
    id: "u1",
    email: "ann@example.com",
    name: "Ann",
    about: null,
    iconUrl: "https://lh3.googleusercontent.com/ann",
    emailVerified: true,
    avatarMinioKey: "avatars/u1/abc.png",
    avatarUrl: "https://minio.test/expired-presigned-link",
    bannerMinioKey: null,
    bannerUrl: null,
    role: "USER",
    headline: null,
    location: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    hashedPassword: "argon-hash",
    passwordSalt: "salt",
    oauthAccounts: [{ provider: "google", providerAccountId: "123", userId: "u1" }],
  },
  google: { avatarMinioKey: null, avatarUrl: null, iconUrl: "https://lh3.googleusercontent.com/g" },
  bare: { avatarMinioKey: null, avatarUrl: null, iconUrl: null },
};

const pick = (value: any, select?: Record<string, any>): any => {
  if (!select || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => pick(v, select));
  return Object.fromEntries(
    Object.entries(select).map(([key, sel]) => [key, sel === true ? value[key] : pick(value[key], sel.select)])
  );
};

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    user: {
      findUnique: async ({ where, select }: { where: { id: string }; select?: Row }) =>
        users[where.id] ? pick(users[where.id], select) : null,
      update: async ({ where, data, select }: { where: { id: string }; data: Row; select?: Row }) =>
        pick(Object.assign(users[where.id]!, data), select),
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
mock.module("@/libs/minioClient", () => ({
  default: {
    presignedUrl: async (_method: string, _bucket: string, key: string, expiry: number) =>
      `https://minio.test/${key}?X-Amz-Expires=${expiry}`,
  },
}));
mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

const { error } = await import("@/utils/errorHandler");
const { getUser, updateUser } = await import("@/api/controller/user");
const { default: avatarRedirect } = await import("@/api/controller/asset/avatarRedirect");
const { stableAvatarUrl } = await import("@/utils/userProfile");

const app = new Elysia()
  .use(error)
  .group("/me", (api) => api.use(getUser).use(updateUser))
  .group("/asset", (api) => api.use(avatarRedirect));

const originalBaseUrl = process.env.BASE_URL;
beforeAll(() => {
  process.env.BASE_URL = "https://api.test";
});
afterAll(() => {
  if (originalBaseUrl === undefined) delete process.env.BASE_URL;
  else process.env.BASE_URL = originalBaseUrl;
});

const auth = { authorization: "Bearer s" };

describe("profile projection", () => {
  it("PATCH /me returns no password hash or salt", async () => {
    const res = await app.handle(
      new Request("http://localhost/me/u1", {
        method: "PATCH",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ headline: "Builder" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty("hashedPassword");
    expect(body).not.toHaveProperty("passwordSalt");
    expect(body.headline).toBe("Builder");
    expect(body.oauthAccounts).toEqual([{ provider: "google" }]);
    expect(body.avatarUrl).toBe(stableAvatarUrl("u1", "avatars/u1/abc.png"));
  });

  it("GET /me serves the stable avatar URL", async () => {
    const { data } = await (await app.handle(new Request("http://localhost/me", { headers: auth }))).json();
    expect(data.avatarUrl).toMatch(/^https:\/\/api\.test\/v3\/asset\/avatar\/u1\?v=[0-9a-f]{12}$/);
    expect(data).not.toHaveProperty("hashedPassword");
    expect(data.oauthAccounts).toEqual([{ provider: "google" }]);
  });
});

describe("GET /asset/avatar/:userId", () => {
  const get = (id: string) => app.handle(new Request(`http://localhost/asset/avatar/${id}`));

  it("302s to a fresh 1 h presigned URL for MinIO avatars", async () => {
    const res = await get("u1");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://minio.test/avatars/u1/abc.png?X-Amz-Expires=3600");
    expect(res.headers.get("cache-control")).toBe("public, max-age=1800");
  });

  it("302s to an external avatar such as the Google picture", async () => {
    const res = await get("google");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://lh3.googleusercontent.com/g");
  });

  it("404s when the user has no avatar or does not exist", async () => {
    expect((await get("bare")).status).toBe(404);
    expect((await get("missing")).status).toBe(404);
  });
});
