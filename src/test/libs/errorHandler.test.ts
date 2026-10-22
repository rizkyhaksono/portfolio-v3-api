import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";
import { error } from "@/utils/errorHandler";
import { NotFoundException, TooManyRequestsException } from "@/constants/exceptions";

const logged: string[] = [];
const app = new Elysia()
  .use(error)
  .decorate({ as: "override" }, "logestic", { error: (msg: string) => logged.push(msg) } as never)
  .get("/busy", () => {
    throw new TooManyRequestsException("Slow down.");
  })
  .get("/missing", () => {
    throw new NotFoundException("Chat not found");
  })
  .post("/signup", () => "ok", {
    body: t.Object({ email: t.String({ format: "email" }), password: t.String({ minLength: 8 }) }),
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

  it("never logs the submitted body of a failed validation", async () => {
    logged.length = 0;
    const res = await app.handle(
      new Request("http://localhost/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ann@example.com", password: "hunter2" }),
      })
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain('"code":"VALIDATION"');
    expect(logged[0]).not.toContain("hunter2");
    expect(logged[0]).not.toContain("ann@example.com");
  });
});
