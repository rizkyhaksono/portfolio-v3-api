import { createElysia } from "@/libs/elysia";

export default createElysia()
  .get("/anime/waifu", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/waifu");
    const { url } = await res.json();
    const imgRes = await fetch(url);
    return new Response(
      imgRes.body, {
      status: 200,
      headers: {
        "Content-Type": imgRes.headers.get("content-type") ?? "image/jpeg",
      },
    });
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Waifu Image",
      description: "Fetch a random waifu image from the waifu.pics API"
    }
  })
  .get("/anime/neko", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/neko");
    const { url } = await res.json();
    const imgRes = await fetch(url);
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    return new Response(imgRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Neko Image",
      description: "Fetch a random neko image from the waifu.pics API"
    }
  })
  .get("/anime/cringe", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/cringe");
    const { url } = await res.json();
    const imgRes = await fetch(url);
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    return new Response(imgRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Cringe Image",
      description: "Fetch a random cringe image from the waifu.pics API"
    }
  })
  .get("/anime/blush", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/blush");
    const { url } = await res.json();
    const imgRes = await fetch(url);
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    return new Response(imgRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Blush Image",
      description: "Fetch a random blush image from the waifu.pics API"
    }
  })
  .get("/anime/dance", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/dance");
    const { url } = await res.json();
    const imgRes = await fetch(url);
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    return new Response(imgRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Dance Image",
      description: "Fetch a random dance image from the waifu.pics API"
    }
  })
  .get("/anime/quote", async () => {
    const res = await fetch("https://api.animechan.io/v1/quotes/random");
    const data = await res.json();
    return data;
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Anime Quote",
      description: "Fetch a random anime quote from the animechan.io API"
    }
  })
  .get("/anime/:name/quote", async ({ params }: { params: { name: string } }) => {
    const res = await fetch(`https://api.animechan.io/v1/anime/${params.name}`);
    const data = await res.json();
    return data;
  }, {
    detail: {
      tags: ["Anime"],
      summary: "Get Quotes by Anime Name",
      description: "Fetch quotes from a specific anime by its name using the animechan.io API"
    }
  })