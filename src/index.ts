import { baseElysia } from "./lib/elysia";
import cors from "@elysiajs/cors";
import { docs } from "./lib/swagger";

const api = baseElysia()
  .use(cors({
    origin: ["rizkyhaksono.natee.my.id", "natee.me", "natee.my.id", "localhost:3000"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }))
  .use(docs)
  .listen(process.env.PORT ?? 3031);

console.log(`🦊 Elysia is running at ${api.server?.hostname}:${api.server?.port}`);