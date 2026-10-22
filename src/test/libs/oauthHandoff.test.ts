import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { Elysia } from "elysia";
import { error } from "@/utils/errorHandler";
import { consumeHandoffCode, createHandoffCode } from "@/libs/oauthHandoff";
import oauthExchange from "@/api/controller/auth/oauthExchange";

const SECRET = "test-internal-secret";
const originalSecret = process.env.INTERNAL_PROXY_SECRET;
const app = new Elysia().use(error).use(oauthExchange);

const exchange = (code: string, key?: string) =>
  app.handle(
    new Request("http://localhost/oauth/exchange", {
      method: "POST",
      headers: { "content-type": "application/json", ...(key && { "x-internal-key": key }) },
      body: JSON.stringify({ code }),
    })
  );

afterEach(() => {
  setSystemTime();
  if (originalSecret === undefined) delete process.env.INTERNAL_PROXY_SECRET;
  else process.env.INTERNAL_PROXY_SECRET = originalSecret;
});

describe("OAuth handoff codes", () => {
  it("are single-use", () => {
    const code = createHandoffCode("session-1");
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(consumeHandoffCode(code)).toBe("session-1");
    expect(consumeHandoffCode(code)).toBeNull();
    expect(consumeHandoffCode("never-issued-code-value")).toBeNull();
  });

  it("expire after 60 seconds", () => {
    const start = Date.UTC(2030, 0, 1);
    setSystemTime(start);
    const fresh = createHandoffCode("session-2");
    const stale = createHandoffCode("session-3");
    setSystemTime(start + 59_000);
    expect(consumeHandoffCode(fresh)).toBe("session-2");
    setSystemTime(start + 60_000);
    expect(consumeHandoffCode(stale)).toBeNull();
  });
});

describe("POST /auth/oauth/exchange", () => {
  it("requires the internal key when INTERNAL_PROXY_SECRET is set", async () => {
    process.env.INTERNAL_PROXY_SECRET = SECRET;
    const code = createHandoffCode("session-4");

    expect((await exchange(code)).status).toBe(401);
    expect((await exchange(code, "wrong-secret-value!!")).status).toBe(401);

    const ok = await exchange(code, SECRET);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ status: 200, token: "session-4" });

    const reused = await exchange(code, SECRET);
    expect(reused.status).toBe(400);
    expect(await reused.json()).toEqual({ name: "BAD_REQUEST", message: "Sign-in link expired. Try again." });
  });

  it("works without the key when no secret is configured", async () => {
    delete process.env.INTERNAL_PROXY_SECRET;
    const res = await exchange(createHandoffCode("session-5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 200, token: "session-5" });
  });
});
