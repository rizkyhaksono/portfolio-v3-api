import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { TtlCache } from "@/utils/ttlCache";

describe("TtlCache", () => {
  afterEach(() => setSystemTime());

  it("expires entries and evicts the oldest past its size cap", () => {
    const start = Date.UTC(2030, 0, 1);
    setSystemTime(start);
    const cache = new TtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);

    setSystemTime(start + 1000);
    expect(cache.get("c")).toBeUndefined();
  });

  it("caches only loads that resolve", async () => {
    const cache = new TtlCache<number>(60_000);
    let loads = 0;
    const load = async () => ++loads;
    expect(await cache.getOrLoad("k", load)).toBe(1);
    expect(await cache.getOrLoad("k", load)).toBe(1);
    await expect(cache.getOrLoad("bad", () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    expect(cache.get("bad")).toBeUndefined();
  });
});
