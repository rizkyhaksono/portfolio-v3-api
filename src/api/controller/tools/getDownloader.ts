import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

/**
 * Universal media downloader, powered by a self-hosted Cobalt instance.
 * One API for YouTube, TikTok, Instagram, X/Twitter, Facebook, and more —
 * Cobalt auto-detects the platform from the URL.
 *
 * Self-host: https://github.com/imputnet/cobalt (see docker-compose.cobalt.yml).
 * Configure with COBALT_API_URL (the instance root, which accepts `POST /`).
 */
const COBALT_API_URL = process.env.COBALT_API_URL ?? "https://dl.natee.my.id";

interface DownloadLink {
  quality: string;
  url: string;
  size?: string;
}

interface DownloadResult {
  title: string;
  thumbnail: string;
  downloadLinks: DownloadLink[];
}

async function fetchFromCobalt(url: string): Promise<DownloadResult> {
  const res = await fetch(COBALT_API_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json().catch(() => null);

  if (!data) {
    throw new Error(`Downloader unreachable (HTTP ${res.status}).`);
  }
  if (data.status === "error") {
    throw new Error(`Downloader error: ${data.error?.code ?? "unknown"}`);
  }

  const downloadLinks: DownloadLink[] = [];
  let thumbnail = "/no-image.jpg";
  let title = "Media";

  if (data.status === "redirect" || data.status === "tunnel" || data.status === "stream") {
    title = data.filename ?? "Media";
    if (typeof data.url === "string" && data.url) {
      downloadLinks.push({ quality: "Download", url: data.url });
    }
  } else if (data.status === "picker" && Array.isArray(data.picker)) {
    title = "Media gallery";
    thumbnail = data.picker[0]?.thumb ?? thumbnail;
    data.picker.forEach((item: { type?: string; url?: string }, i: number) => {
      if (typeof item.url === "string" && item.url) {
        downloadLinks.push({ quality: item.type ? `${item.type} ${i + 1}` : `Item ${i + 1}`, url: item.url });
      }
    });
    if (typeof data.audio === "string" && data.audio) downloadLinks.push({ quality: "Audio", url: data.audio });
  }

  if (downloadLinks.length === 0) {
    throw new Error("No downloadable media found for this URL.");
  }

  return { title, thumbnail, downloadLinks };
}

export default createElysia().get(
  "/download",
  async ({ query, set }: { query: { url: string }; set: { status?: number } }) => {
    const { url } = query;
    if (!url?.trim()) {
      set.status = 400;
      return { status: 400, message: "A media URL is required.", data: null };
    }

    try {
      const data = await fetchFromCobalt(url);
      return { status: 200, message: "Success", data };
    } catch (err) {
      set.status = 502;
      return {
        status: 502,
        message: err instanceof Error ? err.message : "Download failed.",
        data: null,
      };
    }
  },
  {
    query: t.Object({ url: t.String() }),
    detail: {
      tags: ["Tools"],
      summary: "Universal media downloader",
      description:
        "Download from YouTube, TikTok, Instagram, X, Facebook, etc. via a self-hosted Cobalt instance (COBALT_API_URL).",
    },
  },
);
