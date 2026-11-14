import { afterAll, describe, expect, it, mock, spyOn } from "bun:test";
import { Elysia } from "elysia";

mock.module("@/libs/lokiLogger", () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));

const { error } = await import("@/utils/errorHandler");
const { getDownloader, getTiktokDownloader } = await import("@/api/controller/tools");

const originalTrusted = process.env.TRUSTED_PROXY_CIDRS;
process.env.TRUSTED_PROXY_CIDRS = "10.0.0.0/8";

const app = new Elysia().use(error).group("/tools", (api) => api.use(getDownloader).use(getTiktokDownloader));
// app.handle() has no TCP peer. Stand in for the reverse proxy the stack trusts, so x-real-ip
// is the visitor address the same way it is behind Nginx Proxy Manager.
(app as unknown as { server: { requestIP: () => { address: string } } }).server = {
  requestIP: () => ({ address: "10.0.0.9" }),
};
const get = (path: string, ip = "198.51.100.10") =>
  app.handle(new Request(`http://localhost/tools${path}`, { headers: { "x-real-ip": ip } }));
const unsupported = { name: "BAD_REQUEST", message: "That link is not supported." };

const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async () =>
  Response.json({ status: "redirect", url: "https://cdn.example/v.mp4", filename: "v.mp4" })) as unknown as typeof fetch);
afterAll(() => {
  fetchSpy.mockRestore();
  if (originalTrusted === undefined) delete process.env.TRUSTED_PROXY_CIDRS;
  else process.env.TRUSTED_PROXY_CIDRS = originalTrusted;
});

describe("downloader URL validation", () => {
  it.each([
    "https://evil.example.com/video",
    "http://www.youtube.com/watch?v=abc",
    "https://127.0.0.1/video",
    "https://[::1]/video",
    "https://localhost/video",
    "https://169.254.169.254/latest/meta-data",
    "https://user:pass@www.youtube.com/watch?v=abc",
    "https://www.youtube.com:8443/watch?v=abc",
    "https://youtube.com.evil.example/watch?v=abc",
    "not a url",
  ])("rejects %s with 400", async (link) => {
    const res = await get(`/download?url=${encodeURIComponent(link)}`);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(unsupported);
  });

  it("enforces the per-tool host allow-list", async () => {
    const res = await get(`/tiktok/downloader?url=${encodeURIComponent("https://www.youtube.com/watch?v=abc")}`);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(unsupported);
  });

  it("accepts an allowed link and limits each IP to 10 per minute", async () => {
    const link = encodeURIComponent("https://youtu.be/dQw4w9WgXcQ");
    for (let i = 0; i < 10; i++) expect((await get(`/download?url=${link}`, "198.51.100.77")).status).toBe(200);
    const limited = await get(`/download?url=${link}`, "198.51.100.77");
    expect(limited.status).toBe(429);
    expect((await limited.json()).name).toBe("TOO_MANY_REQUESTS");
    expect((await get(`/download?url=${link}`, "198.51.100.78")).status).toBe(200);
  });
});
