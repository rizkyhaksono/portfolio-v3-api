import { createElysia } from "@/libs/elysia";

const USER_AGENT = "portfolio-rizky/1.0 (https://rizky.dev)";

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Each provider resolves a category to a single image URL (or throws).
// Multiple providers per category give resilience when one is down or IP-blocked
// (nekos.best, for example, blocks many datacenter IPs behind Cloudflare).
type UrlResolver = () => Promise<string>;

async function nekosBest(category: string): Promise<string> {
  const res = await fetchWithTimeout(`https://nekos.best/api/v2/${category}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`nekos.best ${res.status}`);
  const { results } = (await res.json()) as { results?: { url?: string }[] };
  const url = results?.[0]?.url;
  if (!url) throw new Error("nekos.best: no url");
  return url;
}

async function waifuPics(category: string): Promise<string> {
  const res = await fetchWithTimeout(`https://api.waifu.pics/sfw/${category}`);
  if (!res.ok) throw new Error(`waifu.pics ${res.status}`);
  const { url } = (await res.json()) as { url?: string };
  if (!url) throw new Error("waifu.pics: no url");
  return url;
}

async function nekosLife(category: string): Promise<string> {
  const res = await fetchWithTimeout(`https://nekos.life/api/v2/img/${category}`);
  if (!res.ok) throw new Error(`nekos.life ${res.status}`);
  const { url } = (await res.json()) as { url?: string };
  if (!url) throw new Error("nekos.life: no url");
  return url;
}

async function purrbot(category: string, type: "img" | "gif"): Promise<string> {
  const res = await fetchWithTimeout(`https://purrbot.site/api/img/sfw/${category}/${type}`);
  if (!res.ok) throw new Error(`purrbot ${res.status}`);
  const data = (await res.json()) as { link?: string };
  if (!data?.link) throw new Error("purrbot: no link");
  return data.link;
}

// High-quality, S3-backed anime images. Reachable from datacenters (no Cloudflare WAF),
// so it's the preferred fallback when nekos.best is IP-blocked in production.
async function nekosApi(tag?: string): Promise<string> {
  const tagParam = tag ? `&tags=${encodeURIComponent(tag)}` : "";
  const res = await fetchWithTimeout(`https://api.nekosapi.com/v4/images/random?rating=safe&limit=1${tagParam}`);
  if (!res.ok) throw new Error(`nekosapi ${res.status}`);
  const data = (await res.json()) as { url?: string }[] | { items?: { url?: string }[] };
  const url = Array.isArray(data) ? data[0]?.url : data?.items?.[0]?.url;
  if (!url) throw new Error("nekosapi: no url");
  return url;
}

const CATEGORY_SOURCES: Record<string, UrlResolver[]> = {
  waifu: [() => nekosBest("waifu"), () => nekosApi("girl"), () => waifuPics("waifu"), () => nekosLife("waifu")],
  neko: [() => nekosBest("neko"), () => purrbot("neko", "img"), () => nekosApi("catgirl"), () => waifuPics("neko"), () => nekosLife("neko")],
  cringe: [() => nekosBest("baka"), () => waifuPics("cringe"), () => nekosLife("baka")],
  blush: [() => nekosBest("blush"), () => waifuPics("blush"), () => purrbot("blush", "gif")],
  dance: [() => nekosBest("dance"), () => purrbot("dance", "gif"), () => waifuPics("dance")],
};

async function streamAnimeImage(category: string): Promise<Response> {
  const sources = CATEGORY_SOURCES[category];
  if (!sources) throw new Error(`Unknown anime category: ${category}`);

  let lastError: unknown;
  for (const resolve of sources) {
    try {
      const url = await resolve();
      const imgRes = await fetchWithTimeout(url);
      if (!imgRes.ok || !imgRes.body) throw new Error(`image ${imgRes.status}`);
      const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
      return new Response(imgRes.body, { status: 200, headers: { "Content-Type": contentType } });
    } catch (error) {
      lastError = error;
      // Try the next provider.
    }
  }
  throw new Error(`Failed to fetch anime ${category} from all providers: ${String(lastError)}`);
}

export default createElysia()
  .get("/anime/waifu", async () => streamAnimeImage("waifu"), {
    detail: { tags: ["Anime"], summary: "Get Waifu Image", description: "Random waifu image (multi-provider fallback)" },
  })
  .get("/anime/neko", async () => streamAnimeImage("neko"), {
    detail: { tags: ["Anime"], summary: "Get Neko Image", description: "Random neko image (multi-provider fallback)" },
  })
  .get("/anime/cringe", async () => streamAnimeImage("cringe"), {
    detail: { tags: ["Anime"], summary: "Get Cringe Image", description: "Random baka/cringe reaction (multi-provider fallback)" },
  })
  .get("/anime/blush", async () => streamAnimeImage("blush"), {
    detail: { tags: ["Anime"], summary: "Get Blush Image", description: "Random blush image (multi-provider fallback)" },
  })
  .get("/anime/dance", async () => streamAnimeImage("dance"), {
    detail: { tags: ["Anime"], summary: "Get Dance Image", description: "Random dance image (multi-provider fallback)" },
  })
  .get("/anime/quote", async () => {
    try {
      const res = await fetchWithTimeout("https://api.animechan.io/v1/quotes/random");
      if (!res.ok) return { status: res.status, message: "Failed to fetch anime quote", data: null };
      return await res.json();
    } catch {
      return { status: 502, message: "Anime quote service unavailable", data: null };
    }
  }, {
    detail: { tags: ["Anime"], summary: "Get Anime Quote", description: "Fetch a random anime quote from the animechan.io API" },
  })
  .get("/anime/:name/quote", async ({ params }: { params: { name: string } }) => {
    try {
      const res = await fetchWithTimeout(`https://api.animechan.io/v1/anime/${params.name}`);
      if (!res.ok) return { status: res.status, message: "Failed to fetch anime quotes", data: null };
      return await res.json();
    } catch {
      return { status: 502, message: "Anime quote service unavailable", data: null };
    }
  }, {
    detail: { tags: ["Anime"], summary: "Get Quotes by Anime Name", description: "Fetch quotes from a specific anime by name (animechan.io)" },
  });
