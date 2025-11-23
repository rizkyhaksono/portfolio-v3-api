import { ForbiddenException, NotFoundException } from "@/constants/exceptions";
import { authGuard } from "@/libs/authGuard";
import { createElysia } from "@/libs/elysia";
import logger from "@/libs/lokiLogger";
import { prismaClient } from "@/libs/prismaDatabase";
import { userGuard } from "@/libs/roleGuards";
import { t } from "elysia";

export default createElysia()
  .use(authGuard)
  .use(userGuard)
  .delete(
    "/:id",
    async ({ params: { id }, user }) => {
      const post = await prismaClient.publicChatMessage.findUnique({
        where: { id },
      });

      if (!post || post.deletedAt) throw new NotFoundException("Message not found");
      if (post.userId !== user.id && user.role !== "ADMIN") throw new ForbiddenException("You can only delete your own messages");

      await prismaClient.publicChatMessage.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      logger.info({
        message: "Public chat message deleted",
        userId: user.id,
        messageId: id,
      });

      return {
        status: 200,
        message: "Message deleted successfully",
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Public Chat"],
        summary: "Delete a public chat message",
        description: "Users can delete their own messages (soft delete). Admins can delete any message.",
      },
    }
  );
