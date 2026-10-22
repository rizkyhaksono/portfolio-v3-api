import { GoogleGenerativeAIFetchError } from "@google/generative-ai";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let now = () => Date.now();

/** Swap the clock behind every limiter and budget in this module (tests only). */
export function setRateLimitClock(clock: () => number): void {
  now = clock;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// In-memory and per process: fine while the API runs as a single replica.
const buckets = new Map<string, { windowMs: number; hits: number[] }>();
let lastSweep = 0;

// Periodically drop buckets whose hits have all aged out, so the Map can't grow unbounded
// across many distinct users/IPs over a long-running process.
function sweep(t: number) {
  if (t - lastSweep < MINUTE_MS) return;
  lastSweep = t;
  for (const [key, bucket] of buckets) {
    if (!bucket.hits.some((h) => t - h < bucket.windowMs)) buckets.delete(key);
  }
}

/** Sliding-window limiter: at most `limit` calls per `windowMs` for `key`. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const t = now();
  sweep(t);
  const hits = (buckets.get(key)?.hits ?? []).filter((h) => t - h < windowMs);
  buckets.set(key, { windowMs, hits });

  if (hits.length >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (t - hits[0]!)) / 1000) };
  }
  hits.push(t);
  return { allowed: true };
}

export function checkAiRateLimit(key: string): RateLimitResult {
  return checkRateLimit(`ai:${key}`, 10, MINUTE_MS);
}

/** Anonymous/public AI endpoints — stricter than signed-in chat. */
export function checkPublicAiRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`public-ai:${ip}`, 5, MINUTE_MS);
}

// Brute-force protection for login/signup/reset, keyed by client IP.
export function checkAuthRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`auth:${ip}`, 5, MINUTE_MS);
}

/** Per-key counters that reset at 00:00 UTC. */
function dailyCounter(limit: number) {
  let day = -1;
  const used = new Map<string, number>();
  const rollover = () => {
    const today = Math.floor(now() / DAY_MS);
    if (today !== day) {
      day = today;
      used.clear();
    }
  };
  return {
    take(key: string): boolean {
      rollover();
      const count = used.get(key) ?? 0;
      if (count >= limit) return false;
      used.set(key, count + 1);
      return true;
    },
    give(key: string): void {
      rollover();
      const count = used.get(key) ?? 0;
      if (count > 0) used.set(key, count - 1);
    },
  };
}

// Gemini's free-tier daily quota (RPD) is shared by one API key, so abuse of the public
// endpoints could exhaust the owner's own allowance. This caps total public calls/day.
// `||`: compose passes unset values as "", which must not become a budget of 0.
const publicDaily = dailyCounter(Number(process.env.AI_PUBLIC_DAILY_BUDGET || 80));
const userDaily = dailyCounter(Number(process.env.AI_USER_DAILY_BUDGET || 40));

/**
 * Only calls Gemini rejected unserved (429/5xx) are refunded, so outages don't drain the day.
 * A reply that came back unusable (cut off, blocked, bad JSON) still spent quota, and refunding
 * it would let one caller bypass the daily cap.
 */
function wasUnserved(err: unknown): boolean {
  return err instanceof GoogleGenerativeAIFetchError && (err.status === 429 || (err.status ?? 0) >= 500);
}

export function checkPublicDailyBudget(): { allowed: boolean } {
  return { allowed: publicDaily.take("public") };
}

export function refundPublicDailyBudget(err: unknown): void {
  if (wasUnserved(err)) publicDaily.give("public");
}

/** Signed-in chat: per-user daily cap (AI_USER_DAILY_BUDGET). */
export function checkUserDailyBudget(userId: string): { allowed: boolean } {
  return { allowed: userDaily.take(userId) };
}

export function refundUserDailyBudget(userId: string, err: unknown): void {
  if (wasUnserved(err)) userDaily.give(userId);
}
