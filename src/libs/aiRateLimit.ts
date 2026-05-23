const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 3;

const buckets = new Map<string, number[]>();

export function checkAiRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = (buckets.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldest = Math.min(...timestamps);
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  buckets.set(userId, timestamps);
  return { allowed: true };
}

export function getAiRateLimitRemaining(userId: string): number {
  const now = Date.now();
  const timestamps = (buckets.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  return Math.max(0, MAX_REQUESTS - timestamps.length);
}
