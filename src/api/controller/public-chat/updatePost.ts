import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException, ForbiddenException } from "@/constants/exceptions";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(publicChatModel)
  .use(authGuard)
  .use(userGuard)
  .patch(
    "/:id",
    async ({ params: { id }, body, user }) => {
      const { message } = body;

      const post = await prismaClient.publicChatMessage.findUnique({
        where: { id },
      });

      if (!post || post.deletedAt) throw new NotFoundException("Message not found");
      if (post.userId !== user.id) throw new ForbiddenException("You can only edit your own messages");

      const updatedPost = await prismaClient.publicChatMessage.update({
        where: { id },
        data: {
          message,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              headline: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              message: true,
              userId: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  headline: true,
                },
              },
            },
          },
        },
      });

      logger.info({
        message: "Public chat message updated",
        userId: user.id,
        messageId: id,
      });

      return {
        status: 200,
        message: "Message updated successfully",
        data: updatedPost,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        message: t.String(),
      }),
      response: {
        200: t.Object({
          status: t.Number(),
          message: t.String(),
          data: t.Any(),
        }),
      },
      detail: {
        tags: ["Public Chat"],
        summary: "Update a public chat message",
        description: "Users can edit their own messages",
      },
    }
  );
