import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { ForbiddenException, NotFoundException } from "@/constants/exceptions";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(publicChatModel)
  .use(authGuard)
  .use(userGuard)
  .post(
    "/",
    async ({
      body,
      user
    }: {
      body: { message: string; replyToId?: string };
      user: { id: string };
    }) => {
      const { message, replyToId } = body;

      if (replyToId) {
        const parentMessage = await prismaClient.publicChatMessage.findFirst({
          where: {
            id: replyToId,
            deletedAt: null,
          },
        });

        if (!parentMessage) {
          throw new NotFoundException("Parent message not found");
        }
      }

      if (!replyToId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingPost = await prismaClient.publicChatMessage.findFirst({
          where: {
            userId: user.id,
            replyToId: null,
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
            deletedAt: null,
          },
        });

        if (existingPost) {
          throw new ForbiddenException(
            "You can only post once per day. You can edit your existing post instead."
          );
        }
      }

      const post = await prismaClient.publicChatMessage.create({
        data: {
          message,
          userId: user.id,
          replyToId: replyToId || null,
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
        message: "Public chat message created",
        userId: user.id,
        postId: post.id,
        isReply: !!replyToId,
      });

      return {
        status: 201,
        message: "Message created successfully",
        data: post,
      };
    },
    {
      body: "publicChat.post",
      detail: {
        tags: ["Public Chat"],
        summary: "Create a public chat message",
        description: "Authenticated users can post once per day (top-level messages only). Replies to messages are unlimited.",
      },
    }
  );
