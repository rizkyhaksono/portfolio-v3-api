import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

type Call = { op: string; args: { where?: { userId?: string } } };
const calls: Call[] = [];
let record: { userId: string; hashedToken: string; expiresAt: Date } | null = null;

const track = (op: string) => (args: Call["args"]) => {
  calls.push({ op, args });
  return { op, args };
};

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    passwordResetToken: {
      findUnique: async () => record,
    },
    $transaction: async (fn: (tx: {
      $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
      passwordResetToken: {
        findUnique: () => Promise<typeof record>;
        delete: (args: Call["args"]) => unknown;
      };
      user: { update: (args: Call["args"]) => unknown };
      session: { deleteMany: (args: Call["args"]) => unknown };
    }) => Promise<void>) =>
      fn({
        $queryRaw: (query, ...values) => {
          calls.push({ op: "user.lock", args: { where: { userId: String(values[0] ?? "") } } });
          if (!query.join("?").includes("FOR UPDATE")) {
            throw new Error("password reset must lock the user row");
          }
          return Promise.resolve([]);
        },
        passwordResetToken: {
          findUnique: async () => record,
          delete: track("passwordResetToken.delete"),
        },
        user: {
          update: track("user.update"),
        },
        session: {
          deleteMany: track("session.deleteMany"),
        },
      }),
  },
}));

const { error } = await import("@/utils/errorHandler");
const { default: resetPassword } = await import("@/api/controller/auth/resetPassword");

const app = new Elysia()
  .decorate("env", { PASSWORD_PEPPER: "test-pepper" })
  .use(error)
  .use(resetPassword);

const confirm = (token: string, password = "new-password-1") =>
  app.handle(
    new Request("http://localhost/password-reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    }),
  );

describe("POST /auth/password-reset/confirm", () => {
  beforeEach(() => {
    calls.length = 0;
    record = {
      userId: "user-1",
      hashedToken: "ignored-by-mock",
      expiresAt: new Date(Date.now() + 60_000),
    };
  });

  it("updates the password and deletes every session for that user", async () => {
    const res = await confirm("reset-token-value");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 200, message: "Password updated successfully" });

    const sessionDelete = calls.find((call) => call.op === "session.deleteMany");
    expect(sessionDelete?.args).toEqual({ where: { userId: "user-1" } });
    expect(calls.map((call) => call.op)).toEqual([
      "user.lock",
      "user.update",
      "passwordResetToken.delete",
      "session.deleteMany",
    ]);
    expect(calls[0]?.args).toEqual({ where: { userId: "user-1" } });
  });

  it("does not touch sessions when the token is expired or unknown", async () => {
    record = { ...record!, expiresAt: new Date(Date.now() - 1000) };
    expect((await confirm("reset-token-value")).status).toBe(400);

    record = null;
    expect((await confirm("reset-token-value")).status).toBe(400);
    expect(calls).toEqual([]);
  });
});
