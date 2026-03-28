import { describe, expect, it } from "bun:test";

const BASE = `http://localhost:${Bun.env.PORT}/v3/rss`;

describe("GET /v3/rss", () => {
  it("returns correct Content-Type header", async () => {
    const res = await fetch(BASE);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/rss+xml");
  });

  it("returns valid RSS 2.0 XML", async () => {
    const res = await fetch(BASE);
    const body = await res.text();

    expect(body).toContain('<?xml version="1.0"');
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain("<channel>");
    expect(body).toContain("</channel>");
    expect(body).toContain("</rss>");
  });

  it("includes required RSS channel fields", async () => {
    const res = await fetch(BASE);
    const body = await res.text();

    expect(body).toContain("<title>");
    expect(body).toContain("<link>");
    expect(body).toContain("<description>");
    expect(body).toContain("<language>");
    expect(body).toContain("<lastBuildDate>");
  });

  it("includes atom:link self-reference", async () => {
    const res = await fetch(BASE);
    const body = await res.text();

    expect(body).toContain('rel="self"');
    expect(body).toContain('type="application/rss+xml"');
  });

  it("sets Cache-Control header", async () => {
    const res = await fetch(BASE);
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });

  it("respects the limit query param", async () => {
    const res = await fetch(`${BASE}?limit=3`);
    const body = await res.text();

    expect(res.status).toBe(200);

    const itemCount = (body.match(/<item>/g) ?? []).length;
    expect(itemCount).toBeLessThanOrEqual(3);
  });

  it("caps limit at 50", async () => {
    const res = await fetch(`${BASE}?limit=999`);
    const body = await res.text();

    const itemCount = (body.match(/<item>/g) ?? []).length;
    expect(itemCount).toBeLessThanOrEqual(50);
  });

  it("each item has required RSS fields", async () => {
    const res = await fetch(`${BASE}?limit=1`);
    const body = await res.text();

    if (body.includes("<item>")) {
      expect(body).toContain("<title>");
      expect(body).toContain("<description>");
      expect(body).toContain("<link>");
      expect(body).toContain("<guid");
      expect(body).toContain("<pubDate>");
      expect(body).toContain("<category>");
    }
  });
});
