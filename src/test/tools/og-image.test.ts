import { describe, expect, it } from "bun:test";

const BASE = `http://localhost:${Bun.env.PORT}/v3/tools`;

describe("GET /v3/tools/og-image", () => {
  it("returns SVG with correct Content-Type header", async () => {
    const res = await fetch(`${BASE}/og-image`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/svg+xml");
  });

  it("returns a valid SVG string", async () => {
    const res = await fetch(`${BASE}/og-image`);
    const body = await res.text();

    expect(body).toContain('<?xml version="1.0"');
    expect(body).toContain("<svg");
    expect(body).toContain("</svg>");
    expect(body).toContain('width="1200"');
    expect(body).toContain('height="630"');
  });

  it("includes the title in SVG output", async () => {
    const title = "My Awesome Project";
    const res = await fetch(
      `${BASE}/og-image?title=${encodeURIComponent(title)}`,
    );
    const body = await res.text();

    expect(body).toContain(title);
  });

  it("includes the description in SVG output", async () => {
    const description = "A cool description here";
    const res = await fetch(
      `${BASE}/og-image?description=${encodeURIComponent(description)}`,
    );
    const body = await res.text();

    expect(body).toContain(description);
  });

  it("applies dark theme by default", async () => {
    const res = await fetch(`${BASE}/og-image`);
    const body = await res.text();

    expect(body).toContain("#0f172a"); // dark background
  });

  it("applies light theme when specified", async () => {
    const res = await fetch(`${BASE}/og-image?theme=light`);
    const body = await res.text();

    expect(body).toContain("#f8fafc"); // light background
  });

  it("shows correct accent color for each type", async () => {
    const cases: [string, string][] = [
      ["project", "#6366f1"],
      ["work", "#10b981"],
      ["education", "#f59e0b"],
      ["blog", "#3b82f6"],
    ];

    for (const [type, color] of cases) {
      const res = await fetch(`${BASE}/og-image?type=${type}`);
      const body = await res.text();
      expect(body).toContain(color);
    }
  });

  it("sets Cache-Control header", async () => {
    const res = await fetch(`${BASE}/og-image`);
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
  });

  it("safely escapes XML special characters in title", async () => {
    const res = await fetch(
      `${BASE}/og-image?title=${encodeURIComponent('<script>&"test"</script>')}`,
    );
    const body = await res.text();

    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });
});
