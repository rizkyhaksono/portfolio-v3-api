import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";

/**
 * Right now Instagram downloader is not working
 */
export default createElysia()
  .get("/instagram/downloader", async ({ query, set }: any) => {
    const { url } = query;

    if (!url) {
      set.status = 400;
      return {
        success: false,
        error: "URL parameter is required",
      };
    }

    const services = [
      {
        name: "snapinsta.app",
        fn: async () => {
          const response = await fetch("https://snapinsta.app/api/ajaxSearch", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: new URLSearchParams({
              q: url,
              t: "media",
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();

          if (data.status !== "ok" && data.status !== "success") {
            throw new Error(data.msg || "Failed to fetch");
          }

          // Parse HTML response for download links
          const html = data.data || "";
          const downloadLinks: any[] = [];

          // Extract download links from HTML
          const linkRegex = /href="([^"]+)"[^>]*class="[^"]*download[^"]*"/gi;
          let match;
          while ((match = linkRegex.exec(html)) !== null) {
            downloadLinks.push({
              url: match[1],
              type: match[1].includes(".mp4") ? "video" : "image",
            });
          }

          if (downloadLinks.length === 0) {
            // Try alternative regex
            const altRegex = /href="([^"]+\.(jpg|jpeg|png|mp4)[^"]*)"/gi;
            while ((match = altRegex.exec(html)) !== null) {
              downloadLinks.push({
                url: match[1],
                type: match[1].includes(".mp4") ? "video" : "image",
              });
            }
          }

          if (downloadLinks.length > 0) {
            return {
              success: true,
              data: {
                url,
                downloads: downloadLinks,
                service: "snapinsta.app",
              },
            };
          }

          throw new Error("No download links found");
        },
      },
      {
        name: "instasave.website",
        fn: async () => {
          const response = await fetch("https://instasave.website/api/ajaxSearch", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: new URLSearchParams({
              q: url,
              t: "media",
              lang: "en",
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();

          if (!data || data.status === "error") {
            throw new Error("Failed to fetch");
          }

          return {
            success: true,
            data: {
              url,
              html: data.data,
              service: "instasave.website",
              note: "Parse HTML response to extract download links",
            },
          };
        },
      },
      {
        name: "downloadgram.com",
        fn: async () => {
          // Direct scraping approach
          const response = await fetch("https://downloadgram.com/", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: new URLSearchParams({
              url: url,
              submit: "",
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const html = await response.text();

          // Extract download links
          const videoMatch = html.match(/href="([^"]*\.cdninstagram\.com[^"]*\.mp4[^"]*)"/i);
          const imageMatch = html.match(/href="([^"]*\.cdninstagram\.com[^"]*\.(jpg|jpeg)[^"]*)"/i);

          const downloads = [];
          if (videoMatch) downloads.push({ url: videoMatch[1], type: "video" });
          if (imageMatch) downloads.push({ url: imageMatch[1], type: "image" });

          if (downloads.length > 0) {
            return {
              success: true,
              data: {
                url,
                downloads,
                service: "downloadgram.com",
              },
            };
          }

          throw new Error("No download links found");
        },
      },
      {
        name: "inflact.com",
        fn: async () => {
          // Alternative API endpoint
          const response = await fetch("https://inflact.com/downloader/instagram/video/get-url", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();

          if (data.url || data.download_url) {
            return {
              success: true,
              data: {
                url,
                downloads: [{
                  url: data.url || data.download_url,
                  type: "video",
                }],
                service: "inflact.com",
              },
            };
          }

          throw new Error("No download links found");
        },
      },
    ];

    // Try each service
    for (const service of services) {
      try {
        logger.info({
          message: "Trying Instagram service",
          service: service.name,
          url,
        });

        const result = await service.fn();
        return result;
      } catch (error) {
        logger.warn({
          message: "Instagram service failed",
          service: service.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        continue;
      }
    }

    // Fallback: Extract shortcode and provide embed URL
    try {
      const shortcodeMatch = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/) || url.match(/\/tv\/([A-Za-z0-9_-]+)/);

      if (shortcodeMatch) {
        return {
          success: true,
          data: {
            url,
            shortcode: shortcodeMatch[1],
            embedUrl: `https://www.instagram.com/p/${shortcodeMatch[1]}/embed/`,
            directUrl: `https://www.instagram.com/p/${shortcodeMatch[1]}/`,
            note: "All download services are temporarily unavailable. Use embed URL or try opening the direct URL in a browser to download manually.",
          },
        };
      }
    } catch { }

    logger.error({
      message: "All Instagram services failed",
      url,
    });

    set.status = 500;
    return {
      success: false,
      error: "Failed to extract Instagram media. All services are temporarily unavailable.",
      hint: "The URL might be private or invalid. Instagram frequently updates their platform which can break third-party downloaders. Try again later or use a different URL.",
    };
  }, {
    query: t.Object({
      url: t.String({ format: "uri" }),
    }),
    detail: {
      tags: ["Social Media Downloaders"],
      summary: "Instagram media downloader",
      description: "Download photos, videos, reels from Instagram using free APIs with multiple fallbacks",
    },
  });
