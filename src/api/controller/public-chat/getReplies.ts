import { createElysia } from "@/libs/elysia";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  paginationQuerySchema,
  createPaginatedResponse,
  parseCursorToDate,
} from "@/utils/pagination";
import { NotFoundException } from "@/constants/exceptions";
import { t } from "elysia";

export default createElysia()
  .use(publicChatModel)
  .get(
    "/:id/replies",
    async ({ params: { id }, query }: any) => {
      const { cursor, limit } = paginationQuerySchema.parse(query);
      const cursorDate = parseCursorToDate(cursor);

      const parentMessage = await prismaClient.publicChatMessage.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!parentMessage) {
        throw new NotFoundException("Message not found");
      }

      const replies = await prismaClient.publicChatMessage.findMany({
        where: {
          replyToId: id,
          deletedAt: null,
          ...(cursorDate && {
            createdAt: {
              lt: cursorDate,
            },
          }),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit + 1,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              headline: true,
            },
          },
        },
      });

      const paginatedResponse = createPaginatedResponse(
        replies,
        limit,
        (reply: any) => reply.createdAt
      );

      return {
        status: 200,
        message: "Success",
        ...paginatedResponse,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        cursor: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 50, default: 10 })),
      }),
      detail: {
        tags: ["Public Chat"],
        summary: "Get replies for a message",
        description: "Retrieve paginated list of replies for a specific message (public endpoint)",
      },
    }
  );
