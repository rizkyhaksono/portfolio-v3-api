import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import blogModel from "@/models/blog.model";

export default createElysia()
  .use(blogModel)
  .use(authGuard)
  .use(adminGuard)
  .patch("/:id", async ({ params: { id }, body }: {
    params: { id: string };
    body: {
      title?: string;
      slug?: string;
      description?: string;
      content?: string;
      coverImage?: string;
      published?: boolean;
    };
  }) => {
    const existing = await prismaClient.blogPost.findUnique({ where: { id } });
    const publishedAt =
      body.published === true && !existing?.publishedAt
        ? new Date()
        : existing?.publishedAt ?? null;

    const post = await prismaClient.blogPost.update({
      where: { id },
      data: {
        ...body,
        ...(body.published !== undefined && { publishedAt }),
      },
    });
    return { status: 200, data: post };
  }, {
    body: "blog.update.model",
    detail: { tags: ["Blog"], summary: "Update blog post" },
  });
