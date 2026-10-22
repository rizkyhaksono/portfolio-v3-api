import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

type RequestIpServer = { requestIP?: (r: Request) => { address?: string } | null };

/** True when the request carries the frontend server's shared secret in `x-internal-key`. */
export function hasValidInternalKey(request: Request): boolean {
  const secret = process.env.INTERNAL_PROXY_SECRET;
  const key = request.headers.get("x-internal-key");
  if (!secret || !key) return false;
  const given = Buffer.from(key);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Resolve the requester's IP for rate limits.
 * The frontend server forwards the visitor's IP in `x-client-ip`, trusted only with a valid
 * `x-internal-key`. Otherwise prefer Cloudflare / x-real-ip, then the last X-Forwarded-For
 * hop — the first hop is attacker-controlled.
 */
export function getClientIp(request: Request, server?: RequestIpServer | null): string {
  const forwarded = request.headers.get("x-client-ip")?.trim();
  if (forwarded && isIP(forwarded) && hasValidInternalKey(request)) return forwarded;

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  return server?.requestIP?.(request)?.address ?? "anonymous";
}
