import { afterAll, describe, expect, it } from "bun:test";
import { GoogleGenerativeAIFetchError, GoogleGenerativeAIResponseError } from "@google/generative-ai";
import {
  checkPublicDailyBudget,
  checkRateLimit,
  checkUserDailyBudget,
  refundPublicDailyBudget,
  refundUserDailyBudget,
  setRateLimitClock,
} from "@/libs/aiRateLimit";

const exhaust = (take: () => { allowed: boolean }) => {
  for (let i = 0; i < 100_000 && take().allowed; i++);
};

afterAll(() => setRateLimitClock(() => Date.now()));

describe("refundPublicDailyBudget", () => {
  it("refunds only calls Gemini rejected unserved (429/5xx)", () => {
    exhaust(checkPublicDailyBudget);
    expect(checkPublicDailyBudget().allowed).toBe(false);

    // Served-but-unusable replies spent quota: no refund.
    refundPublicDailyBudget(new SyntaxError("bad JSON"));
    refundPublicDailyBudget(new GoogleGenerativeAIResponseError("blocked"));
    refundPublicDailyBudget(new GoogleGenerativeAIFetchError("bad request", 400));
    expect(checkPublicDailyBudget().allowed).toBe(false);

    refundPublicDailyBudget(new GoogleGenerativeAIFetchError("quota", 429));
    expect(checkPublicDailyBudget().allowed).toBe(true);
    refundPublicDailyBudget(new GoogleGenerativeAIFetchError("down", 503));
    expect(checkPublicDailyBudget().allowed).toBe(true);
    expect(checkPublicDailyBudget().allowed).toBe(false);
  });
});

describe("daily budgets", () => {
  it("reset at 00:00 UTC, not 24h after the first call", () => {
    let t = Date.UTC(2030, 0, 1, 23, 0, 0);
    setRateLimitClock(() => t);

    exhaust(checkPublicDailyBudget);
    exhaust(() => checkUserDailyBudget("user-a"));
    expect(checkPublicDailyBudget().allowed).toBe(false);
    expect(checkUserDailyBudget("user-a").allowed).toBe(false);
    expect(checkUserDailyBudget("user-b").allowed).toBe(true);

    t = Date.UTC(2030, 0, 1, 23, 59, 59, 999);
    expect(checkPublicDailyBudget().allowed).toBe(false);
    expect(checkUserDailyBudget("user-a").allowed).toBe(false);

    t = Date.UTC(2030, 0, 2, 0, 0, 0);
    expect(checkPublicDailyBudget().allowed).toBe(true);
    expect(checkUserDailyBudget("user-a").allowed).toBe(true);
  });

  it("refunds a user's slot only for unserved Gemini errors", () => {
    setRateLimitClock(() => Date.UTC(2030, 5, 1, 12));
    exhaust(() => checkUserDailyBudget("user-c"));
    refundUserDailyBudget("user-c", new GoogleGenerativeAIFetchError("bad request", 400));
    expect(checkUserDailyBudget("user-c").allowed).toBe(false);
    refundUserDailyBudget("user-c", new GoogleGenerativeAIFetchError("quota", 429));
    expect(checkUserDailyBudget("user-c").allowed).toBe(true);
  });
});

describe("checkRateLimit", () => {
  it("allows `limit` calls per window and reports when to retry", () => {
    let t = Date.UTC(2030, 0, 1);
    setRateLimitClock(() => t);
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit("k", 3, 60_000)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    t += 30_000;
    expect(checkRateLimit("k", 3, 60_000)).toEqual({ allowed: false, retryAfterSeconds: 30 });
    t += 30_000;
    expect(checkRateLimit("k", 3, 60_000).allowed).toBe(true);
  });
});
