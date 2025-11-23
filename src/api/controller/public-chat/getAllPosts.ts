import { createElysia } from "@/libs/elysia";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  paginationQuerySchema,
  createPaginatedResponse,
  parseCursorToDate,
} from "@/utils/pagination";
import { t } from "elysia";

export default createElysia()
  .use(publicChatModel)
  .get(
    "/",
    async ({ query }: any) => {
      const { cursor, limit } = paginationQuerySchema.parse(query);
      const cursorDate = parseCursorToDate(cursor);

      const posts = await prismaClient.publicChatMessage.findMany({
        where: {
          deletedAt: null,
          replyToId: null, // Only fetch top-level messages
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
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });

      const paginatedResponse = createPaginatedResponse(
        posts,
        limit,
        (post: any) => post.createdAt
      );

      const dataWithReplyCount = paginatedResponse.data.map((post: any) => {
        const { _count, ...rest } = post;
        return {
          ...rest,
          replyCount: _count?.replies || 0,
        };
      });

      return {
        status: 200,
        message: "Success",
        data: dataWithReplyCount,
        nextCursor: paginatedResponse.nextCursor,
        hasMore: paginatedResponse.hasMore,
      };
    },
    {
      query: t.Object({
        cursor: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 50, default: 10 })),
      }),
      detail: {
        tags: ["Public Chat"],
        summary: "Get all public chat messages",
        description: "Retrieve paginated list of top-level public chat messages (public endpoint). Use /public-chat/:id/replies to get replies.",
      },
    }
  );
