import { baseElysia } from "./libs/elysia";
import cors from "@elysiajs/cors";
import apiRoutes from "./api";
import { docs } from "./libs/swagger";
import { instrumentation } from "./libs/instrumentation";

const api = baseElysia()
  .use(cors({
    origin: [
      "https://rizkyhaksono.vercel.app",
      "rizkyhaksono.vercel.app",
      "https://rizkyhaksono.natee.my.id",
      "rizkyhaksono.natee.my.id",
      "https://nateee.com",
      "nateee.com",
      "https://natee.my.id",
      "natee.my.id",
      "http://localhost:3000",
      "localhost:3000",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
  }))
  .use(docs)
  .use(apiRoutes)
  .use(instrumentation)
  .get("/", () => "Docs available at /docs")
  .get("/ping", ({
    request,
    headers
  }: {
    request: Request;
    headers: Record<string, string>;
  }) => {
    const userAgent = headers['user-agent'] ?? 'Unknown';
    const ip = headers['x-forwarded-for'] ?? headers['x-real-ip'] ?? 'Unknown';
    const host = headers['host'] ?? 'Unknown';
    const referer = headers['referer'] ?? 'Direct access';
    const acceptLanguage = headers['accept-language'] ?? 'Unknown';

    return {
      status: 200,
      message: "pong 🏓",
      timestamp: new Date().toISOString(),
      user_info: {
        ip_address: ip,
        user_agent: userAgent,
        host: host,
        referer: referer,
        language: acceptLanguage,
        method: request.method,
        url: request.url
      }
    };
  })
  .listen(process.env.PORT ?? 3031);

console.log(`🦊 Elysia is running at ${process.env.NODE_ENV === "development" ? "http://" : "https://"}${api.server?.hostname}:${api.server?.port}`);