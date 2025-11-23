import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  paginationQuerySchema,
  createPaginatedResponse,
  parseCursorToDate,
  PaginationQuery,
} from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

export default createElysia()
  .use(paginationModel)
  .get("/", async ({
    query
  }: {
    query: PaginationQuery;
  }) => {
    const { cursor, limit } = paginationQuerySchema.parse(query);
    const cursorDate = parseCursorToDate(cursor);

    const education = await prismaClient.education.findMany({
      where: cursorDate
        ? {
          created_at: {
            lt: cursorDate,
          },
        }
        : undefined,
      orderBy: {
        created_at: "desc",
      },
      take: limit + 1,
    });

    const paginatedResponse = createPaginatedResponse(
      education,
      limit,
      (edu) => edu.created_at
    );

    return {
      status: 200,
      message: "Success",
      ...paginatedResponse,
    };
  }, {
    query: "pagination.query.model",
    detail: {
      tags: ["Education"],
      summary: "Get all education",
      description: "Get paginated list of education records",
    }
  })