import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { isAdminRequest } from "@/libs/roleGuards";
import { t } from "elysia";

export default createElysia().get(
  "/",
  async ({ query, request }: { query: { publishedOnly?: string }; request: Request }) => {
    // Drafts are listed only for admins (the dashboard); everyone else gets published posts.
    const publishedOnly = query.publishedOnly === "true" || !(await isAdminRequest(request.headers));
    const posts = await prismaClient.blogPost.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { created_at: "desc" },
    });
    return { status: 200, data: posts };
  },
  {
    query: t.Object({
      publishedOnly: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Blog"],
      summary: "List blog posts",
    },
  }
);
