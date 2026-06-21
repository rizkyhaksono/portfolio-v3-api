const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

// Periodically drop buckets whose timestamps have all aged out, so the Map can't
// grow unbounded across many distinct users over a long-running process.
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, ts] of buckets) {
    const live = ts.filter((t) => now - t < WINDOW_MS);
    if (live.length === 0) buckets.delete(key);
    else buckets.set(key, live);
  }
}

export function checkAiRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  sweep(now);
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
