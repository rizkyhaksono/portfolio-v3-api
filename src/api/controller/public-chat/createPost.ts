import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { ForbiddenException, NotFoundException } from "@/constants/exceptions";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";
import { withAvatarUrl } from "@/utils/userProfile";

const DAY_MS = 24 * 60 * 60 * 1000;

const POST_USER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  avatarMinioKey: true,
  headline: true,
} as const;

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

      // Check and insert in one Serializable transaction so two concurrent posts can't both pass.
      const insert = () =>
        prismaClient.$transaction(async (tx) => {
          if (!replyToId) {
            const dayStart = new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
            const existingPost = await tx.publicChatMessage.findFirst({
              where: {
                userId: user.id,
                replyToId: null,
                createdAt: {
                  gte: dayStart,
                  lt: new Date(dayStart.getTime() + DAY_MS),
                },
                deletedAt: null,
              },
              select: { id: true },
            });

            if (existingPost) {
              throw new ForbiddenException(
                "You can only post once per day. You can edit your existing post instead."
              );
            }
          }

          return tx.publicChatMessage.create({
            data: {
              message,
              userId: user.id,
              replyToId: replyToId || null,
            },
            include: {
              user: { select: POST_USER_SELECT },
              replyTo: {
                select: {
                  id: true,
                  message: true,
                  userId: true,
                  createdAt: true,
                  user: { select: POST_USER_SELECT },
                },
              },
            },
          });
        }, { isolationLevel: "Serializable" });

      // P2034: Postgres aborted a conflicting serializable transaction; the retry sees the winner's post.
      const post = await insert().catch((err: { code?: string }) => {
        if (err?.code === "P2034") return insert();
        throw err;
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
        data: {
          ...post,
          user: withAvatarUrl(post.user),
          replyTo: post.replyTo && { ...post.replyTo, user: withAvatarUrl(post.replyTo.user) },
        },
      };
    },
    {
      body: "publicChat.post",
      detail: {
        tags: ["Public Chat"],
        summary: "Create a public chat message",
        description: "Authenticated users can post once per UTC day (top-level messages only). Replies to messages are unlimited.",
      },
    }
  );
