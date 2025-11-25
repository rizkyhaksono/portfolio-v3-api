import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { Innertube } from "youtubei.js";

export default createElysia()
  .get("/info", async ({
    query,
    set
  }: {
    query: {
      url: string
    },
    set: {
      status: number
    }
  }) => {
    const { url } = query;

    if (!url) {
      set.status = 400;
      return {
        success: false,
        error: "URL parameter is required",
      };
    }

    try {
      const youtube = await Innertube.create();

      // Extract video ID from URL
      const videoId = extractVideoId(url);
      if (!videoId) {
        set.status = 400;
        return {
          success: false,
          error: "Invalid YouTube URL",
        };
      }

      const info = await youtube.getInfo(videoId);

      return {
        success: true,
        data: {
          title: info.basic_info.title,
          duration: info.basic_info.duration,
          thumbnail: info.basic_info.thumbnail?.[0]?.url,
          author: info.basic_info.author,
          viewCount: info.basic_info.view_count,
          description: info.basic_info.short_description,
          formats: {
            video: info.streaming_data?.formats?.slice(0, 10).map((f: any) => ({
              quality: f.quality_label || `${f.height}p` || "unknown",
              format: f.mime_type?.split(';')[0]?.split('/')[1] || "mp4",
              bitrate: f.bitrate,
              fps: f.fps,
            })) || [],
            audio: info.streaming_data?.adaptive_formats
              ?.filter((f: any) => f.has_audio && !f.has_video)
              ?.slice(0, 5)
              .map((f: any) => ({
                quality: f.bitrate ? `${Math.round(f.bitrate / 1000)}kbps` : "unknown",
                format: f.mime_type?.split(';')[0]?.split('/')[1] || "mp4",
                bitrate: f.bitrate,
              })) || [],
          },
        },
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        error: error.message || "Failed to fetch video information",
        hint: "Make sure the URL is valid and the video is publicly available",
      };
    }
  }, {
    query: t.Object({
      url: t.String(),
    }),
    detail: {
      tags: ["Social Media Downloaders"],
      summary: "YouTube info downloader",
      description: "Get video information from YouTube posts",
    },
  })
  .get("/download", async ({
    query,
    set
  }: {
    query: {
      url: string;
      format?: "mp4" | "mp3";
    };
    set: {
      status: number;
    };
  }) => {
    const { url, format = "mp4" } = query;

    if (!url) {
      set.status = 400;
      return { success: false, error: "URL parameter is required" };
    }

    try {
      const youtube = await Innertube.create();

      // Extract video ID from URL
      const videoId = extractVideoId(url);
      if (!videoId) {
        set.status = 400;
        return {
          success: false,
          error: "Invalid YouTube URL",
        };
      }

      const info = await youtube.getInfo(videoId);
      const title = info.basic_info.title?.replace(/[^\w\s-]/gi, "").trim().replace(/\s+/g, "_") || "video";

      if (format === "mp3") {
        // Get best audio format
        const audioFormat = info.streaming_data?.adaptive_formats?.find(
          (f: any) => f.has_audio && !f.has_video && f.mime_type?.includes('audio/mp4')
        );

        if (!audioFormat) {
          set.status = 404;
          return {
            success: false,
            error: "No audio format available for this video",
          };
        }

        // Get download URL
        const stream = await youtube.download(videoId, {
          type: 'audio',
          quality: 'best',
          format: 'mp4',
        });

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        return new Response(buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": `attachment; filename="${title}.mp3"`,
            "Content-Length": buffer.length.toString(),
          },
        });
      } else {
        // Get best video+audio format
        const stream = await youtube.download(videoId, {
          type: 'video+audio',
          quality: 'best',
          format: 'mp4',
        });

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        return new Response(buffer, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${title}.mp4"`,
            "Content-Length": buffer.length.toString(),
          },
        });
      }
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        error: error.message || "Failed to download video",
        hint: "Make sure the URL is valid and the video is publicly available",
      };
    }
  }, {
    query: t.Object({
      url: t.String(),
      format: t.Optional(t.Union([t.Literal("mp4"), t.Literal("mp3")])),
    }),
    detail: {
      tags: ["Social Media Downloaders"],
      summary: "YouTube media downloader",
      description: "Download videos and media from YouTube posts",
    },
  });

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}