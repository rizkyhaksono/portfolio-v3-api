import { createElysia } from "@/libs/elysia";

export default createElysia()
  .get("/youtube/info", async () => {
    return {
      status: 200,
      message: "Youtube Downloader API by Natee",
      endpoints: {
        info: "GET /info?url=YOUTUBE_URL - Get video information",
        download: "GET /download?url=YOUTUBE_URL&format=mp4|mp3&quality=highest - Download video/audio"
      },
      usage: {
        "Get video info": "/info?url=https://youtube.com/watch?v=VIDEO_ID",
        "Download video": "/download?url=https://youtube.com/watch?v=VIDEO_ID&format=mp4",
        "Download audio": "/download?url=https://youtube.com/watch?v=VIDEO_ID&format=mp3"
      }
    }
  }, {
    detail: {
      tags: ["Youtube Downloader"],
    }
  })