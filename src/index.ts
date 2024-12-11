import { baseElysia } from "./libs/elysia";
import cors from "@elysiajs/cors";
import apiRoutes from "./api";
import { docs } from "./libs/swagger";

const api = baseElysia()
  .use(cors({
    origin: ["rizkyhaksono.natee.my.id", "natee.me", "natee.me/ai", "natee.my.id", "localhost:3000"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }))
  .use(docs)
  .use(apiRoutes)
  .get("/", () => "Up and running! 🗿")
  .get("/ping", () => {
    return {
      status: 200,
      message: "pong 🏓",
    };
  })
  .listen(Bun.env.PORT ?? 3031);

console.log(`🦊 Elysia is running at ${api.server?.hostname}:${api.server?.port}`);