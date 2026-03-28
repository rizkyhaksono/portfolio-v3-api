import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { prismaClient } from "@/libs/prismaDatabase";

const BASE_URL = "https://nateee.com";
const FEED_TITLE = "Rizky Haksono — Portfolio";
const FEED_DESCRIPTION =
  "Projects, work experience, and updates from Rizky Haksono's portfolio.";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default createElysia().get(
  "/",
  async ({ query, set }: { query: { limit?: string }; set: any }) => {
    const take = Math.min(Math.max(parseInt(query.limit ?? "20") || 20, 1), 50);

    const projects = await prismaClient.project.findMany({
      orderBy: { created_at: "desc" },
      take,
      select: {
        id: true,
        title: true,
        description: true,
        projectLink: true,
        image: true,
        created_at: true,
      },
    });

    const items = projects
      .map(
        (p) => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <description><![CDATA[${p.description}]]></description>
      <link>${escapeXml(p.projectLink)}</link>
      <guid isPermaLink="false">project-${p.id}</guid>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <category>Project</category>${p.image ? `\n      <enclosure url="${escapeXml(p.image)}" type="image/jpeg" length="0"/>` : ""}
    </item>`,
      )
      .join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${BASE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/v3/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/favicon.ico</url>
      <title>${escapeXml(FEED_TITLE)}</title>
      <link>${BASE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`;

    set.headers["Content-Type"] = "application/rss+xml; charset=utf-8";
    set.headers["Cache-Control"] = "public, max-age=3600";

    return rss;
  },
  {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ["RSS"],
      summary: "Get RSS feed",
      description:
        "Returns an RSS 2.0 XML feed of portfolio projects ordered by newest first. Compatible with all RSS readers.",
    },
  },
);
