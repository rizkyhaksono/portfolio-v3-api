import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";

export default createElysia()
  .get("/x/downloader", async ({ query, set }: any) => {
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
        name: "savevideo.me",
        fn: async () => {
          const response = await fetch("https://svdl.net/api/twitter/get-info", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();

          if (!data || !data.data || !data.data.downloads) {
            throw new Error("No video data found");
          }

          const downloads = data.data.downloads.map((item: any, idx: number) => ({
            url: item.url,
            quality: item.quality || (idx === 0 ? "HD" : "SD"),
            size: item.size,
          }));

          return {
            success: true,
            data: {
              url,
              title: data.data.title || "X Video",
              thumbnail: data.data.thumbnail,
              downloads,
              service: "savevideo.me",
            },
          };
        },
      },
      {
        name: "twdown.net",
        fn: async () => {
          const response = await fetch("https://twdown.net/download.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: new URLSearchParams({
              URL: url,
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const html = await response.text();

          // Extract download links from twdown
          const downloadLinks: string[] = [];
          const downloadRegex = /href="(https:\/\/[^"]*(?:video|cdn)[^"]*\.(mp4|m3u8)[^"]*)"/gi;
          let match;

          while ((match = downloadRegex.exec(html)) !== null) {
            downloadLinks.push(match[1]);
          }

          if (downloadLinks.length === 0) {
            throw new Error("No video found");
          }

          return {
            success: true,
            data: {
              url,
              title: "X Video",
              downloads: downloadLinks.map((downloadUrl, idx) => ({
                url: downloadUrl,
                quality: idx === 0 ? "HD" : "SD",
              })),
              service: "twdown.net",
            },
          };
        },
      },
      {
        name: "ssstwitter.com",
        fn: async () => {
          const response = await fetch("https://ssstwitter.com/", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "HX-Request": "true",
              "HX-Target": "target",
              "HX-Current-URL": "https://ssstwitter.com/",
            },
            body: new URLSearchParams({
              id: url,
              locale: "en",
              tt: "1",
            }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const html = await response.text();

          // Extract direct download URLs from ssstwitter
          const downloadLinks: string[] = [];

          // Primary: Look for ssscdn.io download links (the actual CDN URLs)
          const sssCdnRegex = /href="(https:\/\/ssscdn\.io\/[^"]+)"/gi;
          let match;

          while ((match = sssCdnRegex.exec(html)) !== null) {
            downloadLinks.push(match[1]);
          }

          // Fallback: Look for direct video URLs (.mp4 or video CDN URLs)
          if (downloadLinks.length === 0) {
            const videoUrlRegex = /href="([^"]*(?:\.mp4|video\.twimg\.com|v\.cdn\.vine\.co)[^"]*)"/gi;
            while ((match = videoUrlRegex.exec(html)) !== null) {
              downloadLinks.push(match[1]);
            }
          }

          // Second fallback: Look for any download class links
          if (downloadLinks.length === 0) {
            const altRegex = /<a[^>]+class="[^"]*download[^"]*"[^>]+href="([^"]+)"/gi;
            while ((match = altRegex.exec(html)) !== null) {
              const downloadUrl = match[1];
              // Only add if it looks like a direct video URL
              if (downloadUrl.includes('.mp4') || downloadUrl.includes('video') || downloadUrl.includes('cdn')) {
                downloadLinks.push(downloadUrl);
              }
            }
          }

          const titleMatch = html.match(/<p[^>]*class="[^"]*subtitle[^"]*"[^>]*>([^<]+)<\/p>/) ||
            html.match(/<div[^>]*class="[^"]*result-text[^"]*"[^>]*>([^<]+)<\/div>/) ||
            html.match(/<p[^>]*>([^<]+)<\/p>/);

          if (downloadLinks.length === 0) {
            throw new Error("No video download links found");
          }

          return {
            success: true,
            data: {
              url,
              title: titleMatch ? titleMatch[1].trim() : "X Video",
              downloads: downloadLinks.map((downloadUrl, idx) => ({
                url: downloadUrl,
                quality: idx === 0 ? "HD" : "SD",
              })),
              service: "ssstwitter.com",
            },
          };
        },
      },
      {
        name: "twittervid.com",
        fn: async () => {
          const response = await fetch("https://twittervid.com/api/tweet", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) throw new Error("Service unavailable");

          const data = await response.json();
          if (!data.video) throw new Error("No video found");

          return {
            success: true,
            data: {
              url,
              title: data.title || "X Video",
              downloads: data.video.map((v: any) => ({
                url: v.url,
                quality: v.quality || "unknown",
                type: v.type || "video",
              })),
              service: "twittervid.com",
            },
          };
        },
      },
      {
        name: "twitsave.com",
        fn: async () => {
          const apiUrl = `https://twitsave.com/info?url=${encodeURIComponent(url)}`;

          const response = await fetch(apiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });

          if (!response.ok) throw new Error("Service unavailable");

          const html = await response.text();

          // Look for direct video URLs (mp4 files)
          const videoUrlRegex = /href="([^"]*\.mp4[^"]*)"/gi;
          const downloadLinks: string[] = [];
          let match;

          while ((match = videoUrlRegex.exec(html)) !== null) {
            downloadLinks.push(match[1]);
          }

          // Fallback: Look for download buttons with video URLs
          if (downloadLinks.length === 0) {
            const downloadRegex = /<a[^>]+href="([^"]+)"[^>]*(?:download|Download)/gi;
            while ((match = downloadRegex.exec(html)) !== null) {
              const downloadUrl = match[1];
              if (downloadUrl.includes('.mp4') || downloadUrl.includes('video') || downloadUrl.includes('twimg')) {
                downloadLinks.push(downloadUrl);
              }
            }
          }

          const titleMatch = html.match(/<div class="origin-top-right[^>]*>([^<]+)</) ||
            html.match(/<title>([^<]+)<\/title>/) ||
            html.match(/<h\d[^>]*>([^<]+)<\/h\d>/);

          if (downloadLinks.length === 0) {
            throw new Error("No video found");
          }

          return {
            success: true,
            data: {
              url,
              title: titleMatch ? titleMatch[1].trim() : "X Post",
              downloads: downloadLinks.map((downloadUrl, idx) => ({
                url: downloadUrl,
                quality: idx === 0 ? "HD" : "SD",
              })),
              service: "twitsave.com",
            },
          };
        },
      },
    ];

    for (const service of services) {
      try {
        logger.info({
          message: "Trying X/Twitter service",
          service: service.name,
          url,
        });

        const result = await service.fn();
        return result;
      } catch (error) {
        logger.warn({
          message: "X/Twitter service failed",
          service: service.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        continue;
      }
    }

    try {
      const tweetIdMatch = url.match(/status\/(\d+)/);
      if (tweetIdMatch) {
        return {
          success: true,
          data: {
            url,
            tweetId: tweetIdMatch[1],
            embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetIdMatch[1]}`,
            note: "All download services are temporarily unavailable. Use embed URL or try again later.",
          },
        };
      }
    } catch { }

    logger.error({
      message: "All X/Twitter services failed",
      url,
    });

    set.status = 500;
    return {
      success: false,
      error: "Failed to extract X/Twitter media. All services are temporarily unavailable.",
      hint: "The URL might be private, contain no video, or be invalid. Try again later.",
    };
  }, {
    query: t.Object({
      url: t.String({ format: "uri" }),
    }),
    detail: {
      tags: ["Social Media Downloaders"],
      summary: "X (Twitter) media downloader",
      description: "Download videos and media from X/Twitter posts",
    },
  })