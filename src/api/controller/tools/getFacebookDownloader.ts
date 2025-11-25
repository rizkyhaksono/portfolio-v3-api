import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";

export default createElysia()
  .get("/facebook/downloader", async ({ query, set }: any) => {
    const { url } = query;

    if (!url) {
      set.status = 400;
      return {
        success: false,
        error: "URL parameter is required",
      };
    }

    // Try multiple free API services in order
    const services = [
      {
        name: "fdownloader.net",
        fn: async () => {
          const response = await fetch("https://v3.fdownloader.net/api/ajaxSearch", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: new URLSearchParams({
              k_exp: "",
              k_token: "",
              q: url,
              lang: "en",
              web: "fdownloader.net",
              v: "v2",
              w: "",
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();
          if (data.status !== "ok") throw new Error(data.msg || "Failed to fetch");

          const html = data.data;

          // Parse download links
          const hdMatch = html.match(/href="([^"]+)"[^>]*>\s*Download\s+\(HD\)/i);
          const sdMatch = html.match(/href="([^"]+)"[^>]*>\s*Download\s+\(SD\)/i);
          const normalMatch = html.match(/href="([^"]+)"[^>]*>\s*Download/i);

          return {
            success: true,
            data: {
              url,
              downloads: {
                hd: hdMatch ? hdMatch[1] : null,
                sd: sdMatch ? sdMatch[1] : null,
                normal: normalMatch ? normalMatch[1] : null,
              },
              service: "fdownloader.net",
              note: "Download links expire after some time. Use them quickly.",
            },
          };
        },
      },
      {
        name: "getindevice.com",
        fn: async () => {
          const response = await fetch("https://getindevice.com/wp-json/aio-dl/video-data/", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: new URLSearchParams({
              url: url,
              token: "",
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();
          if (!data.medias || data.medias.length === 0) {
            throw new Error("No video found");
          }

          return {
            success: true,
            data: {
              url,
              downloads: data.medias.map((media: any) => ({
                url: media.url,
                quality: media.quality || media.formattedSize || "unknown",
                extension: media.extension || "mp4",
              })),
              service: "getindevice.com",
            },
          };
        },
      },
      {
        name: "getfvid.com",
        fn: async () => {
          const response = await fetch("https://www.getfvid.com/downloader", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: new URLSearchParams({ url }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const html = await response.text();

          // Updated regex patterns for better matching
          const hdMatch = html.match(/href="([^"]+)"[^>]*>\s*Download in HD Quality/i)
            || html.match(/href="([^"]+)"[^>]*class="[^"]*hd[^"]*"/i);
          const sdMatch = html.match(/href="([^"]+)"[^>]*>\s*Download in Normal Quality/i)
            || html.match(/href="([^"]+)"[^>]*class="[^"]*sd[^"]*"/i);

          if (!hdMatch && !sdMatch) {
            throw new Error("No video found");
          }

          return {
            success: true,
            data: {
              url,
              downloads: {
                hd: hdMatch ? hdMatch[1] : null,
                sd: sdMatch ? sdMatch[1] : null,
              },
              service: "getfvid.com",
              note: "Download links expire after some time. Use them quickly.",
            },
          };
        },
      },
    ];

    // Try each service
    for (const service of services) {
      try {
        logger.info({
          message: "Trying Facebook service",
          service: service.name,
          url,
        });

        const result = await service.fn();
        return result;
      } catch (error) {
        logger.warn({
          message: "Facebook service failed",
          service: service.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        continue;
      }
    }

    logger.error({
      message: "All Facebook services failed",
      url,
    });

    set.status = 500;
    return {
      success: false,
      error: "Failed to extract Facebook video. All services are temporarily unavailable.",
      hint: "Make sure the URL is valid and the video is public. Try again later or use a different URL.",
    };
  }, {
    query: t.Object({
      url: t.String({ format: "uri" }),
    }),
    detail: {
      tags: ["Social Media Downloaders"],
      summary: "Facebook video downloader",
      description: "Extract download links for Facebook videos using free APIs",
    },
  });
