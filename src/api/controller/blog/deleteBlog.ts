import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .delete("/:id", async ({ params: { id } }: { params: { id: string } }) => {
    await prismaClient.blogPost.delete({ where: { id } });
    return { status: 200, message: "Blog post deleted" };
  }, {
    detail: { tags: ["Blog"], summary: "Delete blog post" },
  });
