import { describe, expect, it } from "bun:test";

const BASE = `http://localhost:${Bun.env.PORT}/v3/tools`;

describe("GET /v3/tools/leetcode", () => {
  it("returns 422 when username is missing", async () => {
    const res = await fetch(`${BASE}/leetcode`);
    expect(res.status).toBe(422);
  });

  it("returns status 400 for non-existent username", async () => {
    const res = await fetch(
      `${BASE}/leetcode?username=__nonexistent_user_xyz__`,
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe(400);
    expect(typeof data.message).toBe("string");
    expect(data.data).toBeNull();
  });

  it("returns expected shape for a valid username", async () => {
    const res = await fetch(`${BASE}/leetcode?username=tourist`);
    const data = await res.json();

    expect(res.status).toBe(200);

    if (data.status === 200) {
      expect(data).toMatchObject({
        status: 200,
        message: "Success",
        data: {
          username: expect.any(String),
          ranking: expect.any(Number),
          solved: {
            total: expect.any(Number),
            easy: expect.any(Number),
            medium: expect.any(Number),
            hard: expect.any(Number),
          },
        },
      });
    } else {
      // LeetCode API may block or rate-limit in CI — accept graceful error
      expect(data.status).toBe(400);
      expect(typeof data.message).toBe("string");
    }
  });
});
