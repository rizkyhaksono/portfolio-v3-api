import { createElysia } from "@/libs/elysia";

export default createElysia()
  .get("/anime/waifu", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/waifu");
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
    detail: { tags: ["Anime"] }
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
    detail: { tags: ["Anime"] }
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
    detail: { tags: ["Anime"] }
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
    detail: { tags: ["Anime"] }
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
    detail: { tags: ["Anime"] }
  })