import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import youtubedl from "youtube-dl-exec";

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader?: string;
  channel?: string;
  view_count: number;
  description: string;
  upload_date: string;
  formats?: Array<{
    vcodec: string;
    acodec: string;
    format_note?: string;
    height?: number;
    ext: string;
    filesize?: number;
    filesize_approx?: number;
    fps?: number;
    abr?: number;
  }>;
}

export default createElysia()
  .get("/", async () => {
    return {
      message: "YouTube Downloader API",
      endpoints: {
        info: "GET /info?url=YOUTUBE_URL - Get video information",
        download: "GET /download?url=YOUTUBE_URL&format=mp4|mp3 - Download video/audio",
      },
      usage: {
        "Get video info": "/info?url=https://youtube.com/watch?v=VIDEO_ID",
        "Download video": "/download?url=https://youtube.com/watch?v=VIDEO_ID&format=mp4",
        "Download audio": "/download?url=https://youtube.com/watch?v=VIDEO_ID&format=mp3",
      },
      note: "Requires yt-dlp or youtube-dl installed on the system. Install with: 'pip install yt-dlp' or 'brew install yt-dlp'",
    };
  }, {
    detail: {
      tags: ["YouTube Downloader"],
      summary: "YouTube Downloader API Information",
    },
  })

  .get("/info", async ({ query, set }) => {
    const { url } = query;

    if (!url) {
      set.status = 400;
      return {
        success: false,
        error: "URL parameter is required",
      };
    }

    try {
      const result = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      });

      const info = result as VideoInfo;

      return {
        success: true,
        data: {
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          author: info.uploader || info.channel,
          viewCount: info.view_count,
          description: info.description,
          uploadDate: info.upload_date,
          formats: {
            video: info.formats
              ?.filter((f: any) => f.vcodec !== "none" && f.acodec !== "none")
              .map((f: any) => ({
                quality: f.format_note || f.height ? `${f.height}p` : "unknown",
                format: f.ext,
                filesize: f.filesize || f.filesize_approx,
                fps: f.fps,
              }))
              .slice(0, 10) || [],
            audio: info.formats
              ?.filter((f: any) => f.acodec !== "none" && f.vcodec === "none")
              .map((f: any) => ({
                quality: f.abr ? `${f.abr}kbps` : "unknown",
                format: f.ext,
                filesize: f.filesize || f.filesize_approx,
              }))
              .slice(0, 5) || [],
          },
        },
      };
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        error: error.message || "Failed to fetch video information",
        hint: "Make sure yt-dlp is installed: pip install yt-dlp",
      };
    }
  }, {
    query: t.Object({
      url: t.String(),
    }),
    detail: {
      tags: ["YouTube Downloader"],
      summary: "Get YouTube video information",
      description: "Returns video metadata including title, duration, thumbnail, and available formats",
    },
  })

  .get("/download", async ({ query, set }) => {
    const { url, format = "mp4" } = query;

    if (!url) {
      set.status = 400;
      return { success: false, error: "URL parameter is required" };
    }

    try {
      // Get video info first to get the title
      const infoResult = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
      });

      const info = infoResult as VideoInfo;
      const title = info.title.replace(/[^\w\s-]/gi, "").trim().replace(/\s+/g, "_");

      if (format === "mp3") {
        // Download as audio (MP3)
        const audioResult = await youtubedl(url, {
          extractAudio: true,
          audioFormat: "mp3",
          audioQuality: 0, // Best quality
          output: "-", // Output to stdout
          noCheckCertificates: true,
          noWarnings: true,
        });

        const audioBuffer = (audioResult as any).stdout || audioResult;

        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": `attachment; filename="${title}.mp3"`,
          },
        });
      } else {
        // Download as video (MP4)
        const videoResult = await youtubedl(url, {
          format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          output: "-", // Output to stdout
          noCheckCertificates: true,
          noWarnings: true,
        });

        const videoBuffer = (videoResult as any).stdout || videoResult;

        return new Response(videoBuffer, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${title}.mp4"`,
          },
        });
      }
    } catch (error: any) {
      set.status = 500;
      return {
        success: false,
        error: error.message || "Failed to download video",
        hint: "Make sure yt-dlp is installed: pip install yt-dlp",
      };
    }
  }, {
    query: t.Object({
      url: t.String(),
      format: t.Optional(t.Union([t.Literal("mp4"), t.Literal("mp3")])),
    }),
    detail: {
      tags: ["YouTube Downloader"],
      summary: "Download YouTube video or audio",
      description: "Downloads video as MP4 or audio as MP3 format. Requires yt-dlp installed on the system.",
    },
  })