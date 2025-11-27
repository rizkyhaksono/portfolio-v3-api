import { createElysia } from "@/libs/elysia";
import { publicChatModel } from "@/models/publicChat.model";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  pageBasedPaginationQuerySchema,
  PageBasedPaginationQuery,
} from "@/utils/pagination";
import { NotFoundException } from "@/constants/exceptions";
import { t } from "elysia";
import paginationModel from "@/models/pagination.model";

export default createElysia()
  .use(publicChatModel)
  .use(paginationModel)
  .get(
    "/:id/replies",
    async ({ params: { id }, query }: { params: { id: string }; query: PageBasedPaginationQuery }) => {
      const { page, limit } = pageBasedPaginationQuerySchema.parse(query);

      const parentMessage = await prismaClient.publicChatMessage.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!parentMessage) {
        throw new NotFoundException("Message not found");
      }

      // Get total count of replies
      const total = await prismaClient.publicChatMessage.count({
        where: {
          replyToId: id,
          deletedAt: null,
        },
      });

      // Calculate offset
      const offset = (page - 1) * limit;

      // Fetch paginated replies
      const replies = await prismaClient.publicChatMessage.findMany({
        where: {
          replyToId: id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
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

      const totalPages = Math.ceil(total / limit);
      const prev = page > 1 ? page - 1 : null;
      const next = page < totalPages ? page + 1 : null;

      return {
        status: 200,
        message: "Success",
        data: replies,
        page,
        limit,
        total,
        totalPages,
        prev,
        next,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: "pagination.page-based.query.model",
      detail: {
        tags: ["Public Chat"],
        summary: "Get replies for a message",
        description: "Retrieve paginated list of replies for a specific message (public endpoint)",
      },
    }
  );
