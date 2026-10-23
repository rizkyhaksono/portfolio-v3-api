import { beforeEach, describe, expect, it, mock } from "bun:test";

// DB-free: the raw-SQL calls are faked by matching on their statement text.
let nextNumber = 105;
let insertFailures: Error[] = [];
const insertedKeys: string[] = [];

const uniqueViolation = () =>
  Object.assign(new Error("Raw query failed. Code: `23505`. Message: `duplicate key value`"), { code: "P2010" });

mock.module("@/libs/prismaDatabase", () => ({
  prismaClient: {
    $executeRawUnsafe: async () => 0,
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      if (sql.includes("MAX(CAST")) return [{ n: nextNumber++ }];
      if (sql.includes("INSERT INTO")) {
        const failure = insertFailures.shift();
        if (failure) throw failure;
        insertedKeys.push(params[1] as string);
        return [{ id: params[0], key: params[1], title: params[2], status: "todo", order: 1000 }];
      }
      return [];
    },
  },
}));
mock.module("@/libs/minioClient", () => ({ default: {} }));

const { createTask } = await import("@/libs/trackerStore");
const input = {
  title: "Card",
  description: null,
  status: "todo",
  priority: "medium",
  type: "task",
  order: 1000,
  createdById: null,
  createdByName: null,
  createdByAvatar: null,
};

describe("createTask keys", () => {
  beforeEach(() => {
    nextNumber = 105;
    insertFailures = [];
    insertedKeys.length = 0;
  });

  it("retries with a fresh key when two cards race for the same one", async () => {
    insertFailures = [uniqueViolation()];
    const task = await createTask(input);
    expect(task.key).toBe("RH-106");
    expect(insertedKeys).toEqual(["RH-106"]);
  });

  it("recognises the typed P2002 form and gives up after three attempts", async () => {
    insertFailures = [Object.assign(new Error("Unique constraint failed"), { code: "P2002" }), uniqueViolation(), uniqueViolation()];
    await expect(createTask(input)).rejects.toThrow("23505");
    expect(insertedKeys).toEqual([]);
  });

  it("does not retry other errors", async () => {
    insertFailures = [new Error("connection reset")];
    await expect(createTask(input)).rejects.toThrow("connection reset");
    expect(nextNumber).toBe(106);
  });
});
