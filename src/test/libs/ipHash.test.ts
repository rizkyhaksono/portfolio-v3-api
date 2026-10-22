import { afterEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { hashClientIp } from "@/utils/ipHash";

const saved = { salt: process.env.IP_HASH_SALT, pepper: process.env.PASSWORD_PEPPER };
const restore = (key: "IP_HASH_SALT" | "PASSWORD_PEPPER", value: string | undefined) =>
  value === undefined ? delete process.env[key] : (process.env[key] = value);
const legacy = (ip: string, salt: string) => createHash("sha256").update(`${ip}:${salt}`).digest("hex");

afterEach(() => {
  restore("IP_HASH_SALT", saved.salt);
  restore("PASSWORD_PEPPER", saved.pepper);
});

describe("hashClientIp", () => {
  it("derives the salt from PASSWORD_PEPPER instead of a hard-coded literal", () => {
    delete process.env.IP_HASH_SALT;
    process.env.PASSWORD_PEPPER = "pepper-a";
    const a = hashClientIp("203.0.113.7", "portfolio-v3-reactions");
    expect(a).not.toBe(legacy("203.0.113.7", "portfolio-v3-reactions"));
    expect(hashClientIp("203.0.113.7", "portfolio-v3-reactions")).toBe(a);
    expect(hashClientIp("203.0.113.7", "portfolio-v3-feedback")).not.toBe(a);
    process.env.PASSWORD_PEPPER = "pepper-b";
    expect(hashClientIp("203.0.113.7", "portfolio-v3-reactions")).not.toBe(a);
  });

  it("prefers IP_HASH_SALT and does not throw without a pepper", () => {
    process.env.IP_HASH_SALT = "explicit-salt";
    expect(hashClientIp("203.0.113.7", "any")).toBe(legacy("203.0.113.7", "explicit-salt"));
    delete process.env.IP_HASH_SALT;
    delete process.env.PASSWORD_PEPPER;
    expect(hashClientIp("203.0.113.7", "any")).toMatch(/^[0-9a-f]{64}$/);
  });
});
