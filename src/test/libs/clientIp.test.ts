import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getClientIp, hasValidInternalKey } from "@/utils/clientIp";

const SECRET = "test-internal-secret";
const TRUSTED = "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fd00::/8";
const originalSecret = process.env.INTERNAL_PROXY_SECRET;
const originalTrusted = process.env.TRUSTED_PROXY_CIDRS;

const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });
const proxy = { requestIP: () => ({ address: "10.0.0.9" }) };
const mappedProxy = { requestIP: () => ({ address: "::ffff:10.0.0.9" }) };
const outsider = { requestIP: () => ({ address: "203.0.113.10" }) };

describe("getClientIp", () => {
  beforeEach(() => {
    process.env.INTERNAL_PROXY_SECRET = SECRET;
    process.env.TRUSTED_PROXY_CIDRS = TRUSTED;
  });
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.INTERNAL_PROXY_SECRET;
    else process.env.INTERNAL_PROXY_SECRET = originalSecret;
    if (originalTrusted === undefined) delete process.env.TRUSTED_PROXY_CIDRS;
    else process.env.TRUSTED_PROXY_CIDRS = originalTrusted;
  });

  it("trusts x-client-ip only with the matching internal key from a trusted proxy", () => {
    const headers = { "x-client-ip": "203.0.113.7", "x-real-ip": "198.51.100.1" };
    expect(getClientIp(req({ ...headers, "x-internal-key": SECRET }), proxy)).toBe("203.0.113.7");
    expect(getClientIp(req({ ...headers, "x-internal-key": "wrong-secret-value!!" }), proxy)).toBe("198.51.100.1");
    expect(getClientIp(req({ ...headers, "x-internal-key": "short" }), proxy)).toBe("198.51.100.1");
    expect(getClientIp(req(headers), proxy)).toBe("198.51.100.1");
  });

  it("ignores x-client-ip when no secret is configured", () => {
    delete process.env.INTERNAL_PROXY_SECRET;
    const r = req({ "x-client-ip": "203.0.113.7", "x-internal-key": SECRET, "x-real-ip": "198.51.100.2" });
    expect(hasValidInternalKey(r)).toBe(false);
    expect(getClientIp(r, proxy)).toBe("198.51.100.2");
  });

  it("ignores a blank secret", () => {
    process.env.INTERNAL_PROXY_SECRET = "   ";
    const r = req({ "x-client-ip": "203.0.113.7", "x-internal-key": "   ", "x-real-ip": "198.51.100.2" });
    expect(hasValidInternalKey(r)).toBe(false);
    expect(getClientIp(r, proxy)).toBe("198.51.100.2");
  });

  it("rejects a forwarded value that is not an IP", () => {
    const r = req({ "x-client-ip": "evil, 1.2.3.4", "x-internal-key": SECRET, "x-real-ip": "198.51.100.4" });
    expect(getClientIp(r, proxy)).toBe("198.51.100.4");
  });

  it("trusts cf-connecting-ip only when a trusted proxy observed a Cloudflare edge", () => {
    const visitor = "198.51.100.1";
    expect(getClientIp(req({ "cf-connecting-ip": visitor, "x-real-ip": "172.70.1.2" }), proxy)).toBe(visitor);
    expect(getClientIp(req({ "cf-connecting-ip": visitor, "x-forwarded-for": "6.6.6.6, 2606:4700::1" }), proxy)).toBe(visitor);
    expect(getClientIp(req({ "cf-connecting-ip": visitor, "x-real-ip": "203.0.113.50" }), proxy)).toBe("203.0.113.50");
    expect(getClientIp(req({ "cf-connecting-ip": visitor }), proxy)).toBe("10.0.0.9");
    expect(getClientIp(req({ "cf-connecting-ip": "not-an-ip", "x-real-ip": "172.70.1.2" }), proxy)).toBe("172.70.1.2");
  });

  it("ignores forged forwarding headers when the TCP peer is not a trusted proxy", () => {
    const visitor = "198.51.100.1";
    const forged = req({
      "cf-connecting-ip": visitor,
      "x-real-ip": "172.70.1.2",
      "x-forwarded-for": "2606:4700::1",
      "x-client-ip": visitor,
      "x-internal-key": SECRET,
    });
    expect(getClientIp(forged, outsider)).toBe("203.0.113.10");
    expect(getClientIp(forged)).toBe("anonymous");
  });

  it("treats an IPv4-mapped proxy address as the embedded IPv4", () => {
    expect(getClientIp(req({ "x-real-ip": "198.51.100.8" }), mappedProxy)).toBe("198.51.100.8");
  });

  it("falls back x-real-ip, last XFF hop, socket, anonymous", () => {
    const xff = "6.6.6.6, 198.51.100.3";
    expect(getClientIp(req({ "x-real-ip": "198.51.100.2", "x-forwarded-for": xff }), proxy)).toBe("198.51.100.2");
    expect(getClientIp(req({ "x-forwarded-for": xff }), proxy)).toBe("198.51.100.3");
    expect(getClientIp(req({}), proxy)).toBe("10.0.0.9");
    expect(getClientIp(req({}))).toBe("anonymous");
  });

  it("ignores forwarding headers when TRUSTED_PROXY_CIDRS is unset or blank", () => {
    const forged = req({ "cf-connecting-ip": "198.51.100.1", "x-real-ip": "172.70.1.2" });
    delete process.env.TRUSTED_PROXY_CIDRS;
    expect(getClientIp(forged, proxy)).toBe("10.0.0.9");
    process.env.TRUSTED_PROXY_CIDRS = "   ";
    expect(getClientIp(forged, proxy)).toBe("10.0.0.9");
  });

  it("accepts an IPv6 trusted proxy and skips a malformed CIDR", () => {
    process.env.TRUSTED_PROXY_CIDRS = "not-a-cidr, fd00::/8";
    const v6 = { requestIP: () => ({ address: "fd00::1" }) };
    expect(getClientIp(req({ "x-real-ip": "2001:db8::5" }), v6)).toBe("2001:db8::5");
  });
});
