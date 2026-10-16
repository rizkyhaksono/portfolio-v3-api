import { describe, expect, it } from "bun:test";
import { GoogleGenerativeAIFetchError, GoogleGenerativeAIResponseError } from "@google/generative-ai";
import { checkPublicDailyBudget, refundPublicDailyBudget } from "@/libs/aiRateLimit";

describe("refundPublicDailyBudget", () => {
  it("refunds only calls Gemini rejected unserved (429/5xx)", () => {
    for (let i = 0; i < 100_000 && checkPublicDailyBudget().allowed; i++);
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
