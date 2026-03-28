import { describe, expect, it } from "bun:test";

const BASE = `http://localhost:${Bun.env.PORT}/v3/tools`;

describe("GET /v3/tools/codeforces", () => {
  it("returns 422 when handle is missing", async () => {
    const res = await fetch(`${BASE}/codeforces`);
    expect(res.status).toBe(422);
  });

  it("returns status 400 for non-existent handle", async () => {
    const res = await fetch(
      `${BASE}/codeforces?handle=__nonexistent_handle_xyz__`,
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe(400);
    expect(typeof data.message).toBe("string");
    expect(data.data).toBeNull();
  });

  it("returns expected shape for a valid handle", async () => {
    const res = await fetch(`${BASE}/codeforces?handle=tourist&recentCount=5`);
    const data = await res.json();

    expect(res.status).toBe(200);

    if (data.status === 200) {
      expect(data).toMatchObject({
        status: 200,
        message: "Success",
        data: {
          handle: expect.any(String),
          rank: expect.any(String),
          rating: expect.any(Number),
          maxRank: expect.any(String),
          maxRating: expect.any(Number),
          contribution: expect.any(Number),
          friendOfCount: expect.any(Number),
          avatar: expect.any(String),
          registeredAt: expect.any(String),
          lastOnlineAt: expect.any(String),
          recentSubmissions: expect.any(Array),
        },
      });

      const submissions = data.data.recentSubmissions;
      if (submissions.length > 0) {
        expect(submissions[0]).toMatchObject({
          problemName: expect.any(String),
          verdict: expect.any(String),
          language: expect.any(String),
          submittedAt: expect.any(String),
          tags: expect.any(Array),
        });
      }
    } else {
      // Codeforces API may be temporarily unavailable
      expect(data.status).toBe(400);
      expect(typeof data.message).toBe("string");
    }
  });

  it("caps recentCount at 20", async () => {
    const res = await fetch(
      `${BASE}/codeforces?handle=tourist&recentCount=100`,
    );
    const data = await res.json();

    if (data.status === 200) {
      expect(data.data.recentSubmissions.length).toBeLessThanOrEqual(20);
    }
  });
});
