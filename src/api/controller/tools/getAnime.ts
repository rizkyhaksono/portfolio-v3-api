import { createElysia } from "@/libs/elysia";

const NEKOS_BEST_USER_AGENT = "portfolio-rizky/1.0 (https://rizky.dev)";

async function fetchNekosBestImage(category: string): Promise<Response> {
  const res = await fetch(`https://nekos.best/api/v2/${category}`, {
    headers: { "User-Agent": NEKOS_BEST_USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch anime ${category} from nekos.best`);
  }

  const { results } = await res.json();
  const url = results?.[0]?.url;

  if (!url) {
    throw new Error(`No image URL returned for anime ${category}`);
  }

  const imgRes = await fetch(url);
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

  return new Response(imgRes.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
    },
  });
}

export default createElysia()
  .get("/anime/waifu", async () => fetchNekosBestImage("waifu"), {
    detail: {
      tags: ["Anime"],
      summary: "Get Waifu Image",
      description: "Fetch a random waifu image from the nekos.best API",
    },
  })
  .get("/anime/neko", async () => fetchNekosBestImage("neko"), {
    detail: {
      tags: ["Anime"],
      summary: "Get Neko Image",
      description: "Fetch a random neko image from the nekos.best API",
    },
  })
  .get("/anime/cringe", async () => fetchNekosBestImage("baka"), {
    detail: {
      tags: ["Anime"],
      summary: "Get Cringe Image",
      description: "Fetch a random baka reaction GIF from the nekos.best API",
    },
  })
  .get("/anime/blush", async () => fetchNekosBestImage("blush"), {
    detail: {
      tags: ["Anime"],
      summary: "Get Blush Image",
      description: "Fetch a random blush GIF from the nekos.best API",
    },
  })
  .get("/anime/dance", async () => fetchNekosBestImage("dance"), {
    detail: {
      tags: ["Anime"],
      summary: "Get Dance Image",
      description: "Fetch a random dance GIF from the nekos.best API",
    },
  })
  .get("/anime/quote", async () => {
    const res = await fetch("https://api.animechan.io/v1/quotes/random");
    const data = await res.json();
    return data;
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Anime Quote",
      description: "Fetch a random anime quote from the animechan.io API",
    },
  })
  .get("/anime/:name/quote", async ({ params }: { params: { name: string } }) => {
    const res = await fetch(`https://api.animechan.io/v1/anime/${params.name}`);
    const data = await res.json();
    return data;
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Quotes by Anime Name",
      description: "Fetch quotes from a specific anime by its name using the animechan.io API",
    },
  });
