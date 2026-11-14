import { describe, expect, it } from "bun:test";
import { createSessionIfPasswordUnchanged, LUCIA_SESSION_TTL_MS } from "@/libs/passwordSession";

type Created = { data: { id: string; userId: string; expiresAt: Date } };

function txFor(hash: string | null) {
  const created: Created[] = [];
  let sql = "";
  const tx = {
    $queryRaw: <T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> => {
      sql = `${query.join("?")}|${values.join(",")}`;
      return Promise.resolve([{ hashed_password: hash }] as T);
    },
    session: {
      create: (args: Created) => {
        created.push(args);
        return Promise.resolve(args);
      },
    },
  };
  return { tx, created, sql: () => sql };
}

describe("createSessionIfPasswordUnchanged", () => {
  it("locks the user and inserts a 30-day session when the hash is unchanged", async () => {
    const now = Date.UTC(2026, 0, 1);
    const { tx, created, sql } = txFor("hash-1");
    const id = await createSessionIfPasswordUnchanged(tx, { id: "user-1", hashedPassword: "hash-1" }, now);

    expect(sql().replace(/\s+/g, " ")).toContain('SELECT hashed_password FROM "User" WHERE id = ? FOR UPDATE |user-1');
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(created).toEqual([
      { data: { id: id ?? "", userId: "user-1", expiresAt: new Date(now + LUCIA_SESSION_TTL_MS) } },
    ]);
    expect(LUCIA_SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("does not insert a session when the password changed while login was checking it", async () => {
    const { tx, created } = txFor("new-hash");
    const id = await createSessionIfPasswordUnchanged(tx, { id: "user-1", hashedPassword: "old-hash" });
    expect(id).toBeNull();
    expect(created).toEqual([]);
  });
});
