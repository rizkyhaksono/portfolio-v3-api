import { createHash, createHmac } from "node:crypto";

/** IP_HASH_SALT, else a per-label salt derived from PASSWORD_PEPPER, so no salt ships in the source. */
const saltFor = (label: string) =>
  process.env.IP_HASH_SALT ?? createHmac("sha256", process.env.PASSWORD_PEPPER ?? "").update(label).digest("hex");

/** One-way hash of a client IP; raw IPs are never stored. */
export const hashClientIp = (ip: string, label: string) =>
  createHash("sha256").update(`${ip}:${saltFor(label)}`).digest("hex");
