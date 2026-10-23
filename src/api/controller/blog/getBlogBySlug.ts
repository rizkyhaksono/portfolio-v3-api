import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";
import { isAdminRequest } from "@/libs/roleGuards";
import { slugParams } from "@/models/params.model";

export default createElysia().get("/:slug", async ({ params: { slug }, request }: { params: { slug: string }; request: Request }) => {
  const post = await prismaClient.blogPost.findUnique({ where: { slug } });
  // Drafts 404 for the public, same as a missing slug, so their existence does not leak.
  if (!post || (!post.published && !(await isAdminRequest(request.headers)))) throw new NotFoundException("Blog post not found");
  return { status: 200, data: post };
}, {
  params: slugParams,
  detail: {
    tags: ["Blog"],
    summary: "Get blog post by slug",
  },
});
