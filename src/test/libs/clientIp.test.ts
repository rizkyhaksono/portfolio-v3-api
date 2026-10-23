import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getClientIp, hasValidInternalKey } from "@/utils/clientIp";

const SECRET = "test-internal-secret";
const original = process.env.INTERNAL_PROXY_SECRET;

const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });
const server = { requestIP: () => ({ address: "10.0.0.9" }) };

describe("getClientIp", () => {
  beforeEach(() => {
    process.env.INTERNAL_PROXY_SECRET = SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.INTERNAL_PROXY_SECRET;
    else process.env.INTERNAL_PROXY_SECRET = original;
  });

  it("trusts x-client-ip only with the matching internal key", () => {
    const headers = { "x-client-ip": "203.0.113.7", "cf-connecting-ip": "198.51.100.1" };
    expect(getClientIp(req({ ...headers, "x-internal-key": SECRET }))).toBe("203.0.113.7");
    expect(getClientIp(req({ ...headers, "x-internal-key": "wrong-secret-value!!" }))).toBe("198.51.100.1");
    expect(getClientIp(req({ ...headers, "x-internal-key": "short" }))).toBe("198.51.100.1");
    expect(getClientIp(req(headers))).toBe("198.51.100.1");
  });

  it("ignores x-client-ip when no secret is configured", () => {
    delete process.env.INTERNAL_PROXY_SECRET;
    const r = req({ "x-client-ip": "203.0.113.7", "x-internal-key": SECRET, "x-real-ip": "198.51.100.2" });
    expect(hasValidInternalKey(r)).toBe(false);
    expect(getClientIp(r)).toBe("198.51.100.2");
  });

  it("rejects a forwarded value that is not an IP", () => {
    const r = req({ "x-client-ip": "evil, 1.2.3.4", "x-internal-key": SECRET });
    expect(getClientIp(r, server)).toBe("10.0.0.9");
  });

  it("falls back cf-connecting-ip, x-real-ip, last XFF hop, socket, anonymous", () => {
    const xff = "6.6.6.6, 198.51.100.3";
    expect(getClientIp(req({ "cf-connecting-ip": "198.51.100.1", "x-real-ip": "1.1.1.1", "x-forwarded-for": xff }))).toBe(
      "198.51.100.1"
    );
    expect(getClientIp(req({ "x-real-ip": "198.51.100.2", "x-forwarded-for": xff }))).toBe("198.51.100.2");
    expect(getClientIp(req({ "x-forwarded-for": xff }))).toBe("198.51.100.3");
    expect(getClientIp(req({}), server)).toBe("10.0.0.9");
    expect(getClientIp(req({}))).toBe("anonymous");
  });
});
