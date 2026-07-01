import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import MinioClient from "@/libs/minioClient";

type ServiceStatus = "operational" | "degraded" | "down";

interface HealthService {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
  detail?: string;
}

async function timed(fn: () => Promise<void>): Promise<{ ok: boolean; ms: number; detail?: string }> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, detail: e instanceof Error ? e.message : "error" };
  }
}

/** Public health probe for the status page. Each dependency is checked in isolation so one
 * outage doesn't fail the whole response. No paid/external calls (AI is config-only). */
export default createElysia().get(
  "/",
  async () => {
    const services: HealthService[] = [];

    const db = await timed(async () => {
      await prismaClient.$queryRawUnsafe("SELECT 1");
    });
    services.push({ name: "Database", status: db.ok ? "operational" : "down", latencyMs: db.ok ? db.ms : null, detail: db.detail });

    if (process.env.MINIO_HOST) {
      const minio = await timed(async () => {
        await MinioClient.listBuckets();
      });
      services.push({ name: "Storage (MinIO)", status: minio.ok ? "operational" : "down", latencyMs: minio.ok ? minio.ms : null, detail: minio.detail });
    }

    services.push({
      name: "AI (Gemini)",
      status: process.env.GENERATIVE_AI_API_KEY ? "operational" : "down",
      latencyMs: null,
      detail: process.env.GENERATIVE_AI_API_KEY ? "configured" : "not configured",
    });

    const sbUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (sbUrl && sbKey) {
      const sb = await timed(async () => {
        const res = await fetch(`${sbUrl}/rest/v1/`, { method: "HEAD", headers: { apikey: sbKey } });
        if (res.status >= 500) throw new Error(`status ${res.status}`);
      });
      services.push({ name: "Supabase", status: sb.ok ? "operational" : "down", latencyMs: sb.ok ? sb.ms : null, detail: sb.detail });
    }

    const overall: ServiceStatus = services.some((s) => s.status === "down")
      ? "degraded"
      : "operational";

    return { status: 200, message: "Success", data: { overall, services, checkedAt: new Date().toISOString() } };
  },
  {
    detail: {
      tags: ["Health"],
      summary: "Service health check (public)",
      description: "Probes DB, storage, AI config, and Supabase for the public status page.",
    },
  },
);
