import { baseElysia } from "./libs/elysia";
import cors from "@elysiajs/cors";
import apiRoutes from "./api";
import { docs } from "./libs/swagger";

const api = baseElysia()
  .use(cors({
    origin: [
      "https://rizkyhaksono.vercel.app",
      "rizkyhaksono.vercel.app",
      "https://rizkyhaksono.natee.my.id",
      "rizkyhaksono.natee.my.id",
      "https://natee.me",
      "natee.me",
      "https://natee.my.id",
      "natee.my.id",
      "http://localhost:3000",
      "localhost:3000",
    ],
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
  .listen(process.env.PORT ?? 3031);

console.log(`🦊 Elysia is running at ${process.env.NODE_ENV === "development" ? "http://" : "https://"}${api.server?.hostname}:${api.server?.port}`);