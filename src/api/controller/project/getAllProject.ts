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
    query: PaginationQuery
  }) => {
    const { cursor, limit } = paginationQuerySchema.parse(query);
    const cursorDate = parseCursorToDate(cursor);

    const projects = await prismaClient.project.findMany({
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
      projects,
      limit,
      (project) => project.created_at
    );

    return {
      status: 200,
      message: "Success",
      ...paginatedResponse,
    };
  }, {
    query: "pagination.query.model",
    detail: {
      tags: ["Project"],
      summary: "Get all projects",
      description: "Get paginated list of projects",
    }
  })