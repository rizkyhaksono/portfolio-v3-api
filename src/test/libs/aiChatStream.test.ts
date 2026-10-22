import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Elysia } from "elysia";

// DB-free: Prisma and Lucia are faked and fetch is stubbed with SSE bodies, so the real Gemini SDK
// parsing, streamWithTools and the POST /ai handler all run.
type Row = Record<string, unknown>;
const created: Row[] = [];
const deleted: string[] = [];

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    aIChat: {
      findFirst: async () => null,
      create: async () => ({ id: "chat-1" }),
      delete: async () => deleted.push("chat"),
    },
    aIChatMessage: {
      create: async ({ data }: { data: Row }) => {
        created.push(data);
        return { id: `msg-${created.length}`, ...data };
      },
      findMany: async () => [{ msg: "Hi", role: "user" }],
      delete: async () => deleted.push("message"),
    },
    portfolioEmbedding: { findMany: async () => [], deleteMany: async () => ({ count: 0 }) },
  },
}));
mock.module("@/libs/luciaAuth", () => ({
  lucia: {
    sessionCookieName: "auth_session",
    readBearerToken: (h: string) => (h.startsWith("Bearer ") ? h.slice(7) : null),
    readSessionCookie: () => null,
    validateSession: async () => ({ user: { id: "stream-user", role: "USER" }, session: {} }),
    createBlankSessionCookie: () => ({ value: "", attributes: {} }),
  },
}));
mock.module("@/libs/supabaseData", () => ({
  getSupabaseProjects: async () => [{ id: "p1", title: "Portfolio", description: "Site", url: null, source_code: null }],
  getSupabaseCareers: async () => [],
  getSupabaseEducations: async () => [],
}));
mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

const chunk = (parts: Row[], finishReason?: string) => ({
  candidates: [{ index: 0, content: { role: "model", parts }, ...(finishReason && { finishReason }) }],
});
const sse = (...chunks: Row[]) =>
  new Response(chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });

let geminiReplies: (() => Response)[] = [];
const geminiBodies: string[] = [];
const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input).includes(":streamGenerateContent")) {
    geminiBodies.push(String(init?.body));
    return geminiReplies.shift()!();
  }
  return Response.json([]);
}) as unknown as typeof fetch);

const originalKey = process.env.GENERATIVE_AI_API_KEY;
process.env.GENERATIVE_AI_API_KEY = "test-key";
afterAll(() => {
  fetchSpy.mockRestore();
  if (originalKey === undefined) delete process.env.GENERATIVE_AI_API_KEY;
  else process.env.GENERATIVE_AI_API_KEY = originalKey;
});

const { error } = await import("@/utils/errorHandler");
const { default: requestAIChat } = await import("@/api/controller/ai/requestAIChat");
const app = new Elysia().use(error).group("/ai", (api) => api.use(requestAIChat));

const ask = () =>
  app.handle(
    new Request("http://localhost/ai", {
      method: "POST",
      headers: { authorization: "Bearer s", "content-type": "application/json" },
      body: JSON.stringify({ text: "What did Rizky build?" }),
    })
  );
const modelReplies = () => created.filter((m) => m.role === "model").map((m) => m.msg);

describe("POST /ai streaming", () => {
  beforeEach(() => {
    created.length = 0;
    deleted.length = 0;
    geminiBodies.length = 0;
  });

  it("streams the answer after a tool round, then saves it and ends with the chat id", async () => {
    geminiReplies = [
      () => sse(chunk([{ functionCall: { name: "get_projects", args: {} }, thoughtSignature: "sig-1" }], "STOP")),
      () => sse(chunk([{ text: "He built " }]), chunk([{ text: "a portfolio." }], "STOP")),
    ];
    const res = await ask();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("He built a portfolio.\n<!--chatId:chat-1-->");
    expect(modelReplies()).toEqual(["He built a portfolio."]);
    expect(geminiBodies[1]).toContain('"thoughtSignature":"sig-1"');
    expect(geminiBodies[1]).toContain('"functionResponse"');
  });

  it("maps a Gemini 429 before the first chunk to HTTP 429 and rolls back", async () => {
    geminiReplies = [() => new Response(JSON.stringify({ error: { code: 429 } }), { status: 429, statusText: "Too Many Requests" })];
    const res = await ask();
    expect(res.status).toBe(429);
    expect(deleted).toEqual(["message", "chat"]);
    expect(modelReplies()).toEqual([]);
  });

  it("returns 502 when the reply is cut off before any text", async () => {
    geminiReplies = [() => sse(chunk([{ text: "" }], "MAX_TOKENS"))];
    const res = await ask();
    expect(res.status).toBe(502);
    expect(deleted).toEqual(["message", "chat"]);
  });

  it("finishes reading and saves the whole reply when the client disconnects", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const line = (c: Row) => new TextEncoder().encode(`data: ${JSON.stringify(c)}\r\n\r\n`);
    geminiReplies = [
      () =>
        new Response(
          new ReadableStream({
            async start(controller) {
              controller.enqueue(line(chunk([{ text: "One " }])));
              await gate;
              controller.enqueue(line(chunk([{ text: "two " }])));
              controller.enqueue(line(chunk([{ text: "three." }], "STOP")));
              controller.close();
            },
          })
        ),
    ];
    const client = new AbortController();
    const res = await app.handle(
      new Request("http://localhost/ai", {
        method: "POST",
        headers: { authorization: "Bearer s", "content-type": "application/json" },
        body: JSON.stringify({ text: "What did Rizky build?" }),
        signal: client.signal,
      })
    );
    expect(res.status).toBe(200);
    client.abort();
    release();
    for (let i = 0; i < 100 && modelReplies().length === 0; i++) await Bun.sleep(5);
    expect(modelReplies()).toEqual(["One two three."]);
  });

  it("saves the partial text when the stream fails mid-reply", async () => {
    geminiReplies = [() => sse(chunk([{ text: "Partial answer" }]), chunk([{ text: " cut" }], "MAX_TOKENS"))];
    const res = await ask();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Partial answer cut\n<!--chatId:chat-1-->");
    expect(modelReplies()).toEqual(["Partial answer cut"]);
    expect(deleted).toEqual([]);
  });
});
