import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import blogModel from "@/models/blog.model";

export default createElysia()
  .use(blogModel)
  .use(authGuard)
  .use(adminGuard)
  .post("/", async ({ body }: { body: {
    title: string;
    slug: string;
    description: string;
    content: string;
    coverImage?: string;
    published?: boolean;
  } }) => {
    const post = await prismaClient.blogPost.create({
      data: {
        ...body,
        publishedAt: body.published ? new Date() : null,
      },
    });
    return { status: 201, data: post };
  }, {
    body: "blog.model",
    detail: { tags: ["Blog"], summary: "Create blog post" },
  });
