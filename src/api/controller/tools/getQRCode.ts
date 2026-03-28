import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

const VALID_SIZES = ["100x100", "150x150", "200x200", "300x300", "400x400", "500x500"] as const;
type QRSize = (typeof VALID_SIZES)[number];

export default createElysia().get(
  "/qr",
  async ({
    query,
    set,
  }: {
    query: { data: string; size?: QRSize; format?: "png" | "svg" };
    set: any;
  }) => {
    const { data, size = "200x200", format = "png" } = query;

    const encodedData = encodeURIComponent(data);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodedData}&format=${format}`;

    const res = await fetch(qrUrl);

    if (!res.ok) throw new Error("Failed to generate QR code");

    const buffer = await res.arrayBuffer();
    const contentType = format === "svg" ? "image/svg+xml" : "image/png";

    set.headers["Content-Type"] = contentType;
    set.headers["Cache-Control"] = "public, max-age=86400";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
  {
    query: t.Object({
      data: t.String({ minLength: 1, description: "Text or URL to encode" }),
      size: t.Optional(
        t.Union(VALID_SIZES.map((s) => t.Literal(s)) as any, {
          description: "Image size in WxH pixels (default: 200x200)",
        }),
      ),
      format: t.Optional(
        t.Union([t.Literal("png"), t.Literal("svg")], {
          description: "Output format (default: png)",
        }),
      ),
    }),
    detail: {
      tags: ["Tools"],
      summary: "Generate QR code",
      description:
        "Generate a QR code image for any text or URL. Returns PNG or SVG image directly. Sizes: 100–500px. Cached for 24h.",
    },
  },
);
