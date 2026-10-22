import { isIP } from "node:net";
import { BadRequestException, TooManyRequestsException } from "@/constants/exceptions";
import { checkRateLimit } from "@/libs/aiRateLimit";
import { getClientIp } from "@/utils/clientIp";

export const MEDIA_HOSTS = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"],
  tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
  x: ["x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
} as const;

export const ANY_MEDIA_HOST: readonly string[] = Object.values(MEDIA_HOSTS).flat();

/**
 * Validates a user-supplied media link and applies the shared per-IP downloader limit.
 * The exact host allow-list also excludes localhost and private or link-local hosts.
 */
export function guardMediaRequest(
  raw: string | undefined,
  hosts: readonly string[],
  request: Request,
  server?: { requestIP?: (r: Request) => { address?: string } | null } | null
): URL {
  let url: URL | null = null;
  try {
    url = new URL((raw ?? "").trim());
  } catch {
    url = null;
  }
  const host = url?.hostname.toLowerCase().replace(/\.$/, "") ?? "";
  if (
    !url ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    isIP(host.replace(/^\[|\]$/g, "")) ||
    !hosts.includes(host)
  ) {
    throw new BadRequestException("That link is not supported.");
  }

  const rate = checkRateLimit(`download:${getClientIp(request, server)}`, 10, 60 * 1000);
  if (!rate.allowed) {
    throw new TooManyRequestsException(`Too many downloads. Retry in ${rate.retryAfterSeconds ?? 60}s.`);
  }
  return url;
}
