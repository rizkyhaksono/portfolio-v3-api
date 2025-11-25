import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";

/**
 * TikTok video downloader
 * Downloads TikTok videos without watermark
 */
export default createElysia()
  .get("/tiktok/downloader", async ({ query, set }: any) => {
    const { url } = query;

    if (!url) {
      set.status = 400;
      return {
        success: false,
        error: "URL parameter is required",
      };
    }

    try {
      // Using TikTok API alternative
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;

      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch TikTok video");
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.msg || "Failed to process TikTok URL");
      }

      return {
        success: true,
        data: {
          url,
          video: {
            title: data.data.title,
            duration: data.data.duration,
            author: data.data.author?.nickname,
            authorUsername: data.data.author?.unique_id,
            cover: data.data.cover,
            playCount: data.data.play_count,
            likeCount: data.data.digg_count,
            commentCount: data.data.comment_count,
            shareCount: data.data.share_count,
            downloads: {
              noWatermark: data.data.play,
              watermark: data.data.wmplay,
              music: data.data.music,
            },
          },
        },
      };
    } catch (error) {
      logger.error({
        message: "TikTok downloader error",
        url,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      set.status = 500;
      return {
        success: false,
        error: "Failed to extract TikTok video. Make sure the URL is valid.",
      };
    }
  }, {
    query: t.Object({
      url: t.String({ format: "uri" }),
    }),
    detail: {
      tags: ["Social Media Downloaders"],
      summary: "TikTok video downloader",
      description: "Download TikTok videos without watermark",
    },
  });
