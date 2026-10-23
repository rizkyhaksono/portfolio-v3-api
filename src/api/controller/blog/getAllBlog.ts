import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { isAdminRequest } from "@/libs/roleGuards";
import { t } from "elysia";

const SUMMARY_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  coverImage: true,
  published: true,
  publishedAt: true,
  created_at: true,
  updated_at: true,
} as const;

export default createElysia().get(
  "/",
  async ({ query, request, set }: { query: { publishedOnly?: string }; request: Request; set: any }) => {
    const isAdmin = await isAdminRequest(request.headers);
    // Drafts and full bodies are listed only for admins (the dashboard); everyone else gets published summaries.
    const where = query.publishedOnly === "true" || !isAdmin ? { published: true } : undefined;
    const orderBy = { created_at: "desc" } as const;

    // One URL serves public and admin bodies; append to the Vary: Origin that CORS already set.
    set.headers.vary = [set.headers.vary, "Authorization", "Cookie"].filter(Boolean).join(", ");
    if (!isAdmin) {
      set.headers["cache-control"] = "public, max-age=60, stale-while-revalidate=600";
      const posts = await prismaClient.blogPost.findMany({ where, orderBy, select: SUMMARY_SELECT });
      return { status: 200, data: posts };
    }

    set.headers["cache-control"] = "private, no-store";
    const posts = await prismaClient.blogPost.findMany({ where, orderBy });
    return { status: 200, data: posts };
  },
  {
    query: t.Object({
      publishedOnly: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Blog"],
      summary: "List blog posts",
      description: "Public callers get published posts without `content` (cacheable); admins get full rows.",
    },
  }
);
