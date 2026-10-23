import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import MinioClient from "@/libs/minioClient";
import { TtlCache } from "@/utils/ttlCache";

type ServiceStatus = "operational" | "degraded" | "down";

interface HealthService {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
  detail?: string;
}

interface HealthReport {
  overall: ServiceStatus;
  services: HealthService[];
  checkedAt: string;
}

const CHECK_TIMEOUT_MS = 3000;
const timedOut = Symbol("timed out");

// Details are fixed words: this is public, so never echo errors or configuration.
async function probe(name: string, check: () => Promise<boolean>): Promise<HealthService> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof timedOut>((resolve) => {
    timer = setTimeout(() => resolve(timedOut), CHECK_TIMEOUT_MS);
  });
  try {
    const ok = await Promise.race([check(), timeout]);
    if (ok === timedOut) return { name, status: "down", latencyMs: null, detail: "Timed out" };
    return ok
      ? { name, status: "operational", latencyMs: Date.now() - start }
      : { name, status: "down", latencyMs: null, detail: "Unavailable" };
  } catch {
    return { name, status: "down", latencyMs: null, detail: "Not responding" };
  } finally {
    clearTimeout(timer);
  }
}

async function runChecks(): Promise<HealthReport> {
  const checks: Promise<HealthService>[] = [
    probe("Database", async () => {
      await prismaClient.$queryRawUnsafe("SELECT 1");
      return true;
    }),
  ];

  if (process.env.MINIO_HOST) {
    checks.push(probe("S3", () => MinioClient.bucketExists(process.env.MINIO_BUCKET_NAME ?? "")));
  }

  // Config-only check on this API process (no paid Gemini call).
  checks.push(
    Promise.resolve<HealthService>(
      process.env.GENERATIVE_AI_API_KEY
        ? { name: "AI", status: "operational", latencyMs: null }
        : { name: "AI", status: "down", latencyMs: null, detail: "Unavailable" }
    )
  );

  const sbUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (sbUrl && sbKey) {
    checks.push(
      probe("Supabase", async () => {
        const res = await fetch(`${sbUrl}/rest/v1/`, {
          method: "HEAD",
          headers: { apikey: sbKey },
          signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
        });
        return res.status < 500;
      })
    );
  }

  const services = await Promise.all(checks);
  const overall: ServiceStatus = services.some((s) => s.status === "down") ? "degraded" : "operational";
  return { overall, services, checkedAt: new Date().toISOString() };
}

// One shared probe run per 30 s, however many status-page visitors arrive at once.
const reportCache = new TtlCache<HealthReport>(30 * 1000, 1);

/** Public health probe for the status page. Each dependency is checked in isolation so one
 * outage doesn't fail the whole response. No paid/external AI calls (AI is config-only). */
export default createElysia().get(
  "/",
  async () => {
    const data = await reportCache.getOrLoad("report", runChecks);
    return { status: 200, message: "Success", data };
  },
  {
    detail: {
      tags: ["Health"],
      summary: "Service health check (public)",
      description: "Probes DB, storage, AI config, and Supabase for the public status page. Cached for 30 s.",
    },
  },
);
