import { createElysia } from "@/libs/elysia";

export default createElysia()
  .get("/anime/waifu", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/waifu");
    const data = await res.json();
    return {
      status: 200,
      message: "Success",
      result: data.url,
    };
  }, {
    detail: {
      tags: ["Anime"],
    }
  })
  .get("/anime/neko", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/neko");
    const data = await res.json();
    return {
      status: 200,
      message: "Success",
      result: data.url,
    };
  }, {
    detail: {
      tags: ["Anime"],
    }
  })
  .get("/anime/cringe", async () => {
    const res = await fetch("https://api.waifu.pics/sfw/cringe");
    const data = await res.json();
    return {
      status: 200,
      message: "Success",
      result: data.url,
    };
  }, {
    detail: {
      tags: ["Anime"],
    }
  })