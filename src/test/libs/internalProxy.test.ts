import { afterEach, describe, expect, it } from "bun:test";
import { assertProductionProxySecret, hasValidInternalKey } from "@/libs/internalProxy";

const originalNodeEnv = process.env.NODE_ENV;
const originalSecret = process.env.INTERNAL_PROXY_SECRET;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalSecret === undefined) delete process.env.INTERNAL_PROXY_SECRET;
  else process.env.INTERNAL_PROXY_SECRET = originalSecret;
});

describe("INTERNAL_PROXY_SECRET", () => {
  it("refuses to treat a blank secret as configured", () => {
    for (const secret of [undefined, "", "   "]) {
      if (secret === undefined) delete process.env.INTERNAL_PROXY_SECRET;
      else process.env.INTERNAL_PROXY_SECRET = secret;
      const request = new Request("http://localhost/", { headers: { "x-internal-key": secret ?? "" } });
      expect(hasValidInternalKey(request)).toBe(false);
    }
  });

  it("compares secrets of different lengths without throwing", () => {
    process.env.INTERNAL_PROXY_SECRET = "correct-secret-value";
    const request = new Request("http://localhost/", { headers: { "x-internal-key": "x" } });
    expect(hasValidInternalKey(request)).toBe(false);
    const match = new Request("http://localhost/", {
      headers: { "x-internal-key": "correct-secret-value" },
    });
    expect(hasValidInternalKey(match)).toBe(true);
  });

  it("refuses to start in production when the secret is missing or blank", () => {
    process.env.NODE_ENV = "production";
    delete process.env.INTERNAL_PROXY_SECRET;
    expect(assertProductionProxySecret).toThrow(/INTERNAL_PROXY_SECRET/);
    process.env.INTERNAL_PROXY_SECRET = "   ";
    expect(assertProductionProxySecret).toThrow(/INTERNAL_PROXY_SECRET/);
    process.env.INTERNAL_PROXY_SECRET = "a-real-secret";
    expect(assertProductionProxySecret).not.toThrow();
  });

  it("allows a missing secret outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.INTERNAL_PROXY_SECRET;
    expect(assertProductionProxySecret).not.toThrow();
  });
});
