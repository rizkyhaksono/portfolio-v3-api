/**
 * Resolve the requester's IP for rate limits.
 * Prefer Cloudflare / x-real-ip (set by the Next proxy to a trusted hop).
 * For X-Forwarded-For, use the last hop — the first hop is attacker-controlled.
 */
export function getClientIp(
  request: Request,
  server?: { requestIP?: (r: Request) => { address?: string } | null }
): string {
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
