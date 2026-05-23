import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { t } from "elysia";

export default createElysia().get(
  "/",
  async ({ query }: { query: { publishedOnly?: string } }) => {
    const publishedOnly = query.publishedOnly === "true";
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
