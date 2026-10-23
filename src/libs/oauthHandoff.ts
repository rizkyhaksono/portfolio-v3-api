import { createHash, randomBytes } from "node:crypto";

const TTL_MS = 60 * 1000;

// In-memory: the API runs as a single replica, so the callback and the exchange share this Map.
const pending = new Map<string, { sessionId: string; expiresAt: number }>();

const digest = (code: string) => createHash("sha256").update(code).digest("hex");

function prune(now: number) {
  for (const [key, entry] of pending) {
    if (entry.expiresAt <= now) pending.delete(key);
  }
}

/** One-time code the frontend trades for the session id, so the id never appears in a URL. */
export function createHandoffCode(sessionId: string): string {
  const now = Date.now();
  prune(now);
  const code = randomBytes(32).toString("base64url");
  pending.set(digest(code), { sessionId, expiresAt: now + TTL_MS });
  return code;
}

/** Returns the session id once; null when the code is unknown, expired or already used. */
export function consumeHandoffCode(code: string): string | null {
  const now = Date.now();
  prune(now);
  const key = digest(code);
  const entry = pending.get(key);
  if (!entry) return null;
  pending.delete(key);
  return entry.sessionId;
}
