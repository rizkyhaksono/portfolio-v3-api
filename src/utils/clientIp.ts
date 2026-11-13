import { BlockList, isIP } from "node:net";
import { hasValidInternalKey } from "@/libs/internalProxy";

export { hasValidInternalKey } from "@/libs/internalProxy";

type RequestIpServer = { requestIP?: (r: Request) => { address?: string } | null };

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

/** Strip IPv4-mapped IPv6 and zone ids so CIDR checks see the address operators configure. */
function normalizeIp(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  let ip = value.trim();
  if (ip.toLowerCase().startsWith("::ffff:")) ip = ip.slice(7);
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  return isIP(ip) ? ip : undefined;
}

let trustedKey: string | undefined;
let trustedList = new BlockList();

function trustedProxies(): BlockList {
  // Unset and blank both trust nobody. Swarm ingress SNATs public clients onto a
  // private address, so a built-in private-range default would still honor forged headers.
  const raw = process.env.TRUSTED_PROXY_CIDRS?.trim() ?? "";
  if (raw === trustedKey) return trustedList;
  trustedKey = raw;
  const list = new BlockList();
  for (const entry of raw.split(",").map((part) => part.trim()).filter(Boolean)) {
    addTrustedEntry(list, entry);
  }
  trustedList = list;
  return list;
}

function addTrustedEntry(list: BlockList, entry: string): void {
  const slash = entry.lastIndexOf("/");
  if (slash === -1) {
    const family = isIP(entry);
    if (family === 0) return;
    list.addAddress(entry, family === 6 ? "ipv6" : "ipv4");
    return;
  }
  const network = entry.slice(0, slash);
  const prefix = Number(entry.slice(slash + 1));
  const family = isIP(network);
  const max = family === 6 ? 128 : 32;
  if (family === 0 || !Number.isInteger(prefix) || prefix < 0 || prefix > max) return;
  try {
    list.addSubnet(network, prefix, family === 6 ? "ipv6" : "ipv4");
  } catch {
    // A malformed entry adds no trust.
  }
}

function isTrustedProxy(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return false;
  return trustedProxies().check(ip, family === 6 ? "ipv6" : "ipv4");
}

function socketAddress(request: Request, server?: RequestIpServer | null): string | undefined {
  return normalizeIp(server?.requestIP?.(request)?.address);
}

/**
 * Resolve the requester's IP for rate limits.
 * Forwarding headers count only when the TCP peer is inside TRUSTED_PROXY_CIDRS.
 * Unset or blank trusts nobody, so a direct client — including one SNATed onto a
 * private address by Swarm ingress — cannot forge cf-connecting-ip.
 * x-client-ip still requires a valid x-internal-key. cf-connecting-ip counts only
 * when the address the trusted proxy observed is a Cloudflare edge.
 */
export function getClientIp(request: Request, server?: RequestIpServer | null): string {
  const socket = socketAddress(request, server);
  if (!socket || !isTrustedProxy(socket)) return socket ?? "anonymous";

  const forwarded = normalizeIp(request.headers.get("x-client-ip"));
  if (forwarded && hasValidInternalKey(request)) return forwarded;

  const xff = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((hop) => normalizeIp(hop))
    .filter((hop): hop is string => Boolean(hop));
  const observed = normalizeIp(request.headers.get("x-real-ip")) ?? xff?.[xff.length - 1];

  const cf = normalizeIp(request.headers.get("cf-connecting-ip"));
  if (cf && observed && isCloudflareEdge(observed)) return cf;

  return observed ?? socket;
}
