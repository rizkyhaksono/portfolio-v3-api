const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const buckets = new Map<string, number[]>();
const authBuckets = new Map<string, number[]>();
const allStores = [buckets, authBuckets];
let lastSweep = Date.now();

// Periodically drop buckets whose timestamps have all aged out, so the Maps can't
// grow unbounded across many distinct users/IPs over a long-running process.
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const store of allStores) {
    for (const [key, ts] of store) {
      const live = ts.filter((t) => now - t < WINDOW_MS);
      if (live.length === 0) store.delete(key);
      else store.set(key, live);
    }
  }
}

// Global daily budget across ALL public/anonymous AI endpoints. On the Gemini free
// tier the daily request quota (RPD) is shared by one API key, so abuse of the public
// endpoints could exhaust the owner's own allowance. This caps total public calls/day.
const DAILY_PUBLIC_BUDGET = Number(process.env.AI_PUBLIC_DAILY_BUDGET ?? 300);
const DAY_MS = 24 * 60 * 60 * 1000;
let dailyCount = 0;
let dailyResetAt = Date.now() + DAY_MS;

export function checkPublicDailyBudget(): { allowed: boolean } {
  const now = Date.now();
  if (now >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = now + DAY_MS;
  }
  if (dailyCount >= DAILY_PUBLIC_BUDGET) return { allowed: false };
  dailyCount++;
  return { allowed: true };
}

function slidingWindow(
  store: Map<string, number[]>,
  key: string,
  max: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= max) {
    const oldest = Math.min(...timestamps);
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true };
}

export function checkAiRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  sweep(Date.now());
  return slidingWindow(buckets, userId, MAX_REQUESTS);
}

// Stricter limiter for authentication endpoints (login/signup/reset) — brute-force
// protection. Keyed by client IP. Uses the separate authBuckets store (declared above).
const AUTH_MAX_REQUESTS = 5;

export function checkAuthRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  sweep(Date.now());
  return slidingWindow(authBuckets, ip, AUTH_MAX_REQUESTS);
}
