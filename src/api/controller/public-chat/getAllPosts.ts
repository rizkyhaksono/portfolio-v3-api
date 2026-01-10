import { createElysia } from "@/libs/elysia";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  pageBasedPaginationQuerySchema,
  PageBasedPaginationQuery,
} from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

export default createElysia()
  .use(publicChatModel)
  .use(paginationModel)
  .get(
    "/",
    async ({ query }: { query: PageBasedPaginationQuery }) => {
      const { page, limit } = pageBasedPaginationQuerySchema.parse(query);

      // Get total count
      const total = await prismaClient.publicChatMessage.count({
        where: {
          deletedAt: null,
          replyToId: null, // Only fetch top-level messages
        },
      });

      // Calculate offset
      const offset = (page - 1) * limit;

      // Fetch paginated posts
      const posts = await prismaClient.publicChatMessage.findMany({
        where: {
          deletedAt: null,
          replyToId: null, // Only fetch top-level messages
        },
        orderBy: {
          createdAt: "asc",
        },
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              iconUrl: true,
              headline: true,
              role: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });

      const dataWithReplyCount = posts.map((post: any) => {
        const { _count, ...rest } = post;
        return {
          ...rest,
          replyCount: _count?.replies || 0,
        };
      });

      const totalPages = Math.ceil(total / limit);
      const prev = page > 1 ? page - 1 : null;
      const next = page < totalPages ? page + 1 : null;

      return {
        status: 200,
        message: "Success",
        data: dataWithReplyCount,
        page,
        limit,
        total,
        totalPages,
        prev,
        next,
      };
    },
    {
      query: "pagination.page-based.query.model",
      detail: {
        tags: ["Public Chat"],
        summary: "Get all public chat messages",
        description: "Retrieve paginated list of top-level public chat messages (public endpoint). Use /public-chat/:id/replies to get replies.",
      },
    }
  );
