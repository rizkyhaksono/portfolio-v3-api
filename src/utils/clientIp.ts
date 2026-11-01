import { timingSafeEqual } from "node:crypto";
import { BlockList, isIP } from "node:net";

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

// Cloudflare's published edge ranges (cloudflare.com/ips-v4, /ips-v6). Refresh when they announce a change.
const CLOUDFLARE_EDGES = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
  "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
];
const cloudflare = new BlockList();
for (const cidr of CLOUDFLARE_EDGES) {
  const [network, prefix] = cidr.split("/");
  cloudflare.addSubnet(network, Number(prefix), isIP(network) === 6 ? "ipv6" : "ipv4");
}

function isCloudflareEdge(ip: string): boolean {
  const family = isIP(ip);
  return family !== 0 && cloudflare.check(ip, family === 6 ? "ipv6" : "ipv4");
}

/**
 * Resolve the requester's IP for rate limits.
 * The frontend server forwards the visitor's IP in `x-client-ip`, trusted only with a valid
 * `x-internal-key`. Otherwise the peer is what the origin proxy saw (x-real-ip, else the last
 * X-Forwarded-For hop; the first hop is attacker-controlled). `cf-connecting-ip` counts only when
 * that peer is a Cloudflare edge: anyone reaching the origin directly can send the header too.
 */
export function getClientIp(request: Request, server?: RequestIpServer | null): string {
  const forwarded = request.headers.get("x-client-ip")?.trim();
  if (forwarded && isIP(forwarded) && hasValidInternalKey(request)) return forwarded;

  const xff = request.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  const peer =
    request.headers.get("x-real-ip")?.trim() || xff?.[xff.length - 1] || server?.requestIP?.(request)?.address;

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf && isIP(cf) && peer && isCloudflareEdge(peer)) return cf;

  return peer ?? "anonymous";
}
