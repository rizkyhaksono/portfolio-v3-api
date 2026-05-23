import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";

export default createElysia().get("/:slug", async ({ params: { slug } }: { params: { slug: string } }) => {
  const post = await prismaClient.blogPost.findUnique({ where: { slug } });
  if (!post) throw new NotFoundException("Blog post not found");
  return { status: 200, data: post };
}, {
  detail: {
    tags: ["Blog"],
    summary: "Get blog post by slug",
  },
});
