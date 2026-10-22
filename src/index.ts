import { baseElysia } from "./libs/elysia";
import cors from "@elysiajs/cors";
import apiRoutes from "./api";
import { getAllowedOrigins } from "./constants/corsOrigins";

const docsEnabled = process.env.API_DOCS_ENABLED === "true";

// AI chat runs a multi-round tool loop before its first byte; Elysia's default 30s idle cut drops it.
const api = baseElysia({ serve: { idleTimeout: 120 } })
  .use(cors({
    origin: getAllowedOrigins(),
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));

if (docsEnabled) api.use((await import("./libs/swagger")).docs);
api.use(apiRoutes);
// Imported lazily: building the plugin starts the OpenTelemetry SDK.
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) api.use((await import("./libs/instrumentation")).instrumentation);

api
  .get("/", () => (docsEnabled ? "Docs available at /docs" : "Portfolio v3 API"), {
    detail: {
      tags: ["General"],
      summary: "Docs endpoint",
      description: "Endpoint for accessing API documentation.",
    }
  })
  .get("/ping", () => ({ status: "ok" }), {
    detail: {
      tags: ["General"],
      summary: "Ping endpoint",
      description: "Liveness probe for the container healthcheck.",
    }
  })
  .listen(process.env.PORT ?? 3121);

console.log(`🦊 Elysia is running at ${process.env.NODE_ENV === "development" ? "http://" : "https://"}${api.server?.hostname}:${api.server?.port}`);
