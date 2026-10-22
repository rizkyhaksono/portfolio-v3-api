import { afterAll, afterEach, beforeEach, describe, expect, it, mock, setSystemTime, spyOn } from "bun:test";

// DB-free: Prisma and Supabase are faked and fetch answers Gemini's embedContent calls.
const events: string[] = [];
let rows: unknown[] = [];
let projects = [{ id: "p1", title: "Alpha", description: "First" }];

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    portfolioEmbedding: {
      findMany: async () => {
        events.push("read");
        return rows;
      },
      deleteMany: () => events.push("delete"),
      createMany: ({ data }: { data: unknown[] }) => events.push(`create:${data.length}`),
    },
    $transaction: async (ops: unknown[]) => {
      events.push("commit");
      return ops;
    },
  },
}));
mock.module("@/libs/supabaseData", () => ({
  getSupabaseProjects: async () => projects,
  getSupabaseCareers: async () => [],
  getSupabaseEducations: async () => [],
}));
mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

let failEmbedding = false;
const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL) => {
  if (!String(input).includes(":embedContent")) return Response.json([]);
  events.push("embed");
  if (failEmbedding) return new Response("{}", { status: 503, statusText: "Unavailable" });
  return Response.json({ embedding: { values: [1, 0, 0] } });
}) as unknown as typeof fetch);

const originalKey = process.env.GENERATIVE_AI_API_KEY;
process.env.GENERATIVE_AI_API_KEY = "test-key";
afterAll(() => {
  fetchSpy.mockRestore();
  if (originalKey === undefined) delete process.env.GENERATIVE_AI_API_KEY;
  else process.env.GENERATIVE_AI_API_KEY = originalKey;
});

const { indexPortfolioContent, retrievePortfolioContext } = await import("@/libs/rag");

describe("RAG index", () => {
  beforeEach(() => {
    events.length = 0;
    failEmbedding = false;
  });
  afterEach(() => setSystemTime());

  it("answers without context and never reindexes inline when the index is empty", async () => {
    // Past the 10-minute row cache, which other test files may have filled.
    setSystemTime(Date.now() + 11 * 60 * 1000);
    rows = [];
    expect(await retrievePortfolioContext("What did Rizky build?")).toBe("");
    expect(await retrievePortfolioContext("Anything else?")).toBe("");
    expect(events).toEqual(["read"]);
  });

  it("embeds every row before replacing the index in one transaction, then rereads", async () => {
    projects = [
      { id: "p1", title: "Alpha", description: "First" },
      { id: "p2", title: "Beta", description: "Second" },
    ];
    expect(await indexPortfolioContent()).toEqual({ indexed: 2 });
    expect(events).toEqual(["embed", "embed", "delete", "create:2", "commit"]);

    events.length = 0;
    rows = [{ sourceType: "project", sourceId: "p1", content: "Project: Alpha", embedding: [1, 0, 0] }];
    expect(await retrievePortfolioContext("Alpha?")).toContain("Project: Alpha");
    expect(events[0]).toBe("read");
  });

  it("keeps the old index when an embedding fails", async () => {
    projects = [{ id: "p3", title: "Gamma", description: "Third" }];
    failEmbedding = true;
    await expect(indexPortfolioContent()).rejects.toThrow();
    expect(events).not.toContain("delete");
    expect(events).not.toContain("commit");
  });
});