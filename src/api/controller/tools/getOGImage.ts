import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

type OGType = "project" | "work" | "education" | "blog";
type OGTheme = "dark" | "light";

const ACCENT_COLORS: Record<OGType, string> = {
  project: "#6366f1",
  work: "#10b981",
  education: "#f59e0b",
  blog: "#3b82f6",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const word of text.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function buildSVG(
  title: string,
  description: string,
  type: OGType,
  theme: OGTheme,
): string {
  const isDark = theme === "dark";
  const bgColor = isDark ? "#0f172a" : "#f8fafc";
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  const subTextColor = isDark ? "#94a3b8" : "#64748b";
  const accentColor = ACCENT_COLORS[type];

  const safeTitle = escapeXml(title.slice(0, 55));
  const safeDesc = escapeXml(description.slice(0, 120));
  const safeType = escapeXml(type.toUpperCase());
  const badgeWidth = type.length * 12 + 40;

  const descLines = wrapText(safeDesc, 58);
  const descSvg = descLines
    .map(
      (line, i) =>
        `<text x="80" y="${375 + i * 40}" font-family="Inter,system-ui,sans-serif" font-size="26" fill="${subTextColor}">${line}</text>`,
    )
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.3"/>
    </linearGradient>
    <clipPath id="cardClip">
      <rect x="40" y="40" width="1120" height="550" rx="24"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${bgColor}"/>

  <!-- Card -->
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="${cardBg}"/>

  <!-- Top accent bar -->
  <rect x="40" y="40" width="1120" height="10" fill="url(#accentGrad)" clip-path="url(#cardClip)"/>

  <!-- Left accent stripe -->
  <rect x="40" y="40" width="8" height="550" fill="${accentColor}" clip-path="url(#cardClip)"/>

  <!-- Type badge -->
  <rect x="80" y="100" width="${badgeWidth}" height="38" rx="19" fill="${accentColor}" opacity="0.15"/>
  <text x="${80 + badgeWidth / 2}" y="124" font-family="Inter,system-ui,sans-serif" font-size="16" font-weight="600" fill="${accentColor}" text-anchor="middle">${safeType}</text>

  <!-- Title -->
  <text x="80" y="250" font-family="Inter,system-ui,sans-serif" font-size="58" font-weight="700" fill="${textColor}">${safeTitle}</text>

  <!-- Description -->
  ${descSvg}

  <!-- Divider -->
  <line x1="80" y1="520" x2="1120" y2="520" stroke="${subTextColor}" stroke-width="1" opacity="0.2"/>

  <!-- Branding dot + label -->
  <circle cx="100" cy="558" r="12" fill="${accentColor}" opacity="0.85"/>
  <text x="122" y="563" font-family="Inter,system-ui,sans-serif" font-size="20" fill="${subTextColor}">rizkyhaksono.vercel.app</text>
</svg>`;
}

export default createElysia().get(
  "/og-image",
  async ({
    query,
    set,
  }: {
    query: {
      title?: string;
      description?: string;
      type?: OGType;
      theme?: OGTheme;
    };
    set: any;
  }) => {
    const title = query.title ?? "Portfolio";
    const description = query.description ?? "";
    const type = query.type ?? "project";
    const theme = query.theme ?? "dark";

    set.headers["Content-Type"] = "image/svg+xml";
    set.headers["Cache-Control"] = "public, max-age=86400";

    return buildSVG(title, description, type, theme);
  },
  {
    query: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      type: t.Optional(
        t.Union([
          t.Literal("project"),
          t.Literal("work"),
          t.Literal("education"),
          t.Literal("blog"),
        ]),
      ),
      theme: t.Optional(t.Union([t.Literal("dark"), t.Literal("light")])),
    }),
    detail: {
      tags: ["Tools"],
      summary: "Generate dynamic Open Graph image",
      description:
        "Returns an SVG image (1200×630) for use as og:image. Supports type-based accent colors and dark/light themes. Safe to use directly in <meta property=\"og:image\">.",
    },
  },
);
