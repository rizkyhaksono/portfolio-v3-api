import { afterAll, describe, expect, it, mock } from "bun:test";

// DB-free: Prisma and MinIO are faked; the real health handler runs via app.handle().
let dbCalls = 0;
let releaseDb!: () => void;
const dbGate = new Promise<void>((resolve) => (releaseDb = resolve));

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    $queryRawUnsafe: async () => {
      dbCalls++;
      await dbGate;
      return [];
    },
  },
}));
mock.module("@/libs/minioClient", () => ({
  default: {
    bucketExists: async () => {
      throw new Error("InvalidAccessKeyId: check MINIO_ACCESS_KEY");
    },
  },
}));

const ENV_KEYS = [
  "MINIO_HOST",
  "GENERATIVE_AI_API_KEY",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
for (const key of ENV_KEYS) delete process.env[key];
process.env.MINIO_HOST = "minio.test";
afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const { default: getHealth } = await import("@/api/controller/health/getHealth");
const check = async () => (await getHealth.handle(new Request("http://localhost/"))).json();

describe("GET /health", () => {
  it("shares one probe run, caches it, and only reports generic details", async () => {
    const first = check();
    const second = check();
    await Bun.sleep(5);
    expect(dbCalls).toBe(1);
    releaseDb();

    const [a, b] = await Promise.all([first, second]);
    expect(b).toEqual(a);
    expect((await check()).data.checkedAt).toBe(a.data.checkedAt);
    expect(dbCalls).toBe(1);

    expect(a.data.overall).toBe("degraded");
    expect(a.data.services).toEqual([
      { name: "Database", status: "operational", latencyMs: expect.any(Number) },
      { name: "S3", status: "down", latencyMs: null, detail: "Not responding" },
      { name: "AI", status: "down", latencyMs: null, detail: "Unavailable" },
    ]);
  });
});
