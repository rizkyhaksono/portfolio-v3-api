/**
 * Resolve the requester's IP from the standard proxy headers, falling back to the
 * socket address. Used to rate-limit anonymous/public endpoints per client.
 */
export function getClientIp(
  request: Request,
  server?: { requestIP?: (r: Request) => { address?: string } | null }
): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    server?.requestIP?.(request)?.address ??
    "anonymous"
  );
}
