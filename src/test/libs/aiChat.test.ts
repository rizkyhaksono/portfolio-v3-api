import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

// DB-free: Prisma (sorting messages only when asked, like the real client) and Lucia are faked.
const t1 = new Date("2030-01-01T00:00:00Z");
const t2 = new Date("2030-01-01T00:00:05Z");
const chats = [
  {
    id: "c1",
    userId: "u1",
    chatTitle: "Hello",
    createdAt: t1,
    messages: [
      { id: "m2", msg: "Hi there", role: "model", createdAt: t2 },
      { id: "m1", msg: "Hello", role: "user", createdAt: t1 },
    ],
  },
];

type Args = {
  where: { userId: string; id?: string };
  select?: unknown;
  include?: { messages: { orderBy?: { createdAt: "asc" | "desc" } } };
};
const withMessages = (chat: (typeof chats)[number], args: Args) => {
  const order = args.include?.messages.orderBy?.createdAt;
  const messages = order
    ? [...chat.messages].sort((a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * (order === "asc" ? 1 : -1))
    : chat.messages;
  return { ...chat, messages };
};
const mine = (args: Args) => chats.filter((c) => c.userId === args.where.userId && (!args.where.id || c.id === args.where.id));

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    aIChat: {
      findMany: async (args: Args) =>
        mine(args).map((chat) =>
          args.select
            ? { id: chat.id, chatTitle: chat.chatTitle, createdAt: chat.createdAt, _count: { messages: chat.messages.length } }
            : withMessages(chat, args)
        ),
      findFirst: async (args: Args) => {
        const chat = mine(args)[0];
        return chat ? withMessages(chat, args) : null;
      },
    },
  },
}));
mock.module("@/libs/luciaAuth", () => ({
  lucia: {
    sessionCookieName: "auth_session",
    readBearerToken: (h: string) => (h.startsWith("Bearer ") ? h.slice(7) : null),
    readSessionCookie: () => null,
    validateSession: async () => ({ user: { id: "u1", role: "USER" }, session: {} }),
    createBlankSessionCookie: () => ({ value: "", attributes: {} }),
  },
}));
mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

const { error } = await import("@/utils/errorHandler");
const { getAIChat, getAIChatById } = await import("@/api/controller/ai");

const app = new Elysia().use(error).group("/ai", (api) => api.use(getAIChat).use(getAIChatById));
const get = (path: string) => app.handle(new Request(`http://localhost/ai${path}`, { headers: { authorization: "Bearer s" } }));

describe("AI chat history", () => {
  it("?summary=1 lists chats with message counts and no messages", async () => {
    const res = await get("?summary=1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 200,
      data: [{ id: "c1", title: "Hello", createdAt: t1.toISOString(), messageCount: 2 }],
    });
  });

  it("full list and single chat return messages oldest first", async () => {
    const list = await (await get("")).json();
    expect(list.data[0].messages.map((m: { id: string }) => m.id)).toEqual(["m1", "m2"]);

    const one = await (await get("/c1")).json();
    expect(one.status).toBe(200);
    expect(Object.keys(one.data)).toEqual(["id", "title", "createdAt", "messages"]);
    expect(one.data.messages).toEqual([
      { id: "m1", msg: "Hello", role: "user", createdAt: t1.toISOString() },
      { id: "m2", msg: "Hi there", role: "model", createdAt: t2.toISOString() },
    ]);
  });

  it("a missing chat is a real HTTP 404", async () => {
    const res = await get("/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ name: "NOT_FOUND", message: "AI Chat not found" });
  });
});
