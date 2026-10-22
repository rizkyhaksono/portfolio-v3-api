import { baseElysia } from "./libs/elysia";
import cors from "@elysiajs/cors";
import apiRoutes from "./api";
import { docs } from "./libs/swagger";
import { instrumentation } from "./libs/instrumentation";
import { getAllowedOrigins } from "./constants/corsOrigins";

// AI chat runs a multi-round tool loop before its first byte; Elysia's default 30s idle cut drops it.
const api = baseElysia({ serve: { idleTimeout: 120 } })
  .use(cors({
    origin: getAllowedOrigins(),
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }))
  .use(docs)
  .use(apiRoutes)
  .use(instrumentation)
  .get("/", () => "Docs available at /docs", {
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
  .listen(process.env.PORT ?? 3031);

console.log(`🦊 Elysia is running at ${process.env.NODE_ENV === "development" ? "http://" : "https://"}${api.server?.hostname}:${api.server?.port}`);
