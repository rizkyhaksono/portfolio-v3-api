import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { error } from "@/utils/errorHandler";
import { NotFoundException, TooManyRequestsException } from "@/constants/exceptions";

const app = new Elysia()
  .use(error)
  .get("/busy", () => {
    throw new TooManyRequestsException("Slow down.");
  })
  .get("/missing", () => {
    throw new NotFoundException("Chat not found");
  });

const get = (path: string) => app.handle(new Request(`http://localhost${path}`));

describe("global error handler", () => {
  it("turns TooManyRequestsException into HTTP 429 with name + message", async () => {
    const res = await get("/busy");
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ name: "TOO_MANY_REQUESTS", message: "Slow down." });
  });

  it("keeps a thrown NotFoundException message", async () => {
    const res = await get("/missing");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ name: "NOT_FOUND", message: "Chat not found" });
  });

  it("stays generic for unknown routes", async () => {
    const res = await get("/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ name: "NOT_FOUND", message: "The requested resource was not found." });
  });
});
