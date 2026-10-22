/**
 * Map with per-entry expiry and a size cap (the oldest entry is evicted first).
 * In-memory per process: fine while the API runs as a single replica.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly ttlMs: number, private readonly maxSize = 500) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxSize) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }

  /** Cached value, or the result of `load` (cached only when it resolves). */
  async getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await load();
    this.set(key, value);
    return value;
  }
}
