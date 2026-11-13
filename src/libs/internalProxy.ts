import { createHash, timingSafeEqual } from "node:crypto";

/** Non-empty shared secret, or undefined when unset or blank. */
export function internalProxySecret(): string | undefined {
  const secret = process.env.INTERNAL_PROXY_SECRET?.trim();
  return secret ? secret : undefined;
}

/**
 * Production must not boot with an open internal-proxy check. An empty default
 * used to skip the `x-internal-key` requirement entirely.
 */
export function assertProductionProxySecret(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (!internalProxySecret()) {
    throw new Error(
      "INTERNAL_PROXY_SECRET must be set to a non-empty value when NODE_ENV is production",
    );
  }
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
