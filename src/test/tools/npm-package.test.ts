import { describe, expect, it } from "bun:test";

const BASE = `http://localhost:${Bun.env.PORT}/v3/tools`;

describe("GET /v3/tools/npm", () => {
  it("returns 422 when name is missing", async () => {
    const res = await fetch(`${BASE}/npm`);
    expect(res.status).toBe(422);
  });

  it("returns status 404 for non-existent package", async () => {
    const res = await fetch(
      `${BASE}/npm?name=__nonexistent-package-xyz-abc-123__`,
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe(404);
    expect(typeof data.message).toBe("string");
    expect(data.data).toBeNull();
  });

  it("returns expected shape for a valid package", async () => {
    const res = await fetch(`${BASE}/npm?name=elysia`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe(200);
    expect(data.message).toBe("Success");
    expect(data.data).toMatchObject({
      name: "elysia",
      version: expect.any(String),
      description: expect.any(String),
      totalVersions: expect.any(Number),
      distTags: expect.objectContaining({ latest: expect.any(String) }),
      downloads: {
        weekly: expect.any(Number),
        monthly: expect.any(Number),
      },
    });
  });

  it("handles scoped packages like @elysiajs/cors", async () => {
    const res = await fetch(
      `${BASE}/npm?name=${encodeURIComponent("@elysiajs/cors")}`,
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe(200);
    expect(data.data.name).toBe("@elysiajs/cors");
  });

  it("returns keywords as an array", async () => {
    const res = await fetch(`${BASE}/npm?name=elysia`);
    const data = await res.json();

    if (data.status === 200) {
      expect(Array.isArray(data.data.keywords)).toBe(true);
    }
  });

  it("returns totalVersions greater than 0 for existing package", async () => {
    const res = await fetch(`${BASE}/npm?name=elysia`);
    const data = await res.json();

    if (data.status === 200) {
      expect(data.data.totalVersions).toBeGreaterThan(0);
    }
  });
});
