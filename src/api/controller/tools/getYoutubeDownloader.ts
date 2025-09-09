import { createElysia } from "@/libs/elysia";

export default createElysia()
  .get("/youtube-downloader", async (c) => {
    const url = c.query.url as string;

    if (!url) {
      return {
        status: 400,
        message: "Bad Request",
        result: null,
      };
    }

    const res = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "",
        "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
      }
    });

    if (!res.ok) {
      return {
        status: res.status,
        message: res.statusText,
        result: null,
      };
    }

    const data = await res.json();

    return {
      status: 200,
      message: "Success",
      result: data,
    };
  }, {
    detail: {
      tags: ["YouTube Downloader"],
    }
  })