import { createHash, timingSafeEqual } from "node:crypto";

/** Non-empty shared secret, or undefined when unset or blank. */
export function internalProxySecret(): string | undefined {
  const secret = process.env.INTERNAL_PROXY_SECRET?.trim();
  return secret ? secret : undefined;
}

/** True when `x-internal-key` matches the configured secret. Blank secrets never match. */
export function hasValidInternalKey(request: Request): boolean {
  const secret = internalProxySecret();
  const key = request.headers.get("x-internal-key");
  if (!secret || !key) return false;
  // Hash both sides so a length mismatch cannot skip the comparison or throw.
  const given = createHash("sha256").update(key).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected);
}
