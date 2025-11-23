import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  paginationQuerySchema,
  createPaginatedResponse,
  parseCursorToDate,
} from "@/utils/pagination";
import { t } from "elysia";
import workModel from "@/models/work.model";

export default createElysia()
  .use(workModel)
  .get("/", async ({
    query
  }: {
    query: {
      cursor?: string;
      limit?: number;
    }
  }) => {
    const { cursor, limit } = paginationQuerySchema.parse(query);
    const cursorDate = parseCursorToDate(cursor);

    const work = await prismaClient.work.findMany({
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
      work,
      limit,
      (w) => w.created_at
    );

    return {
      status: 200,
      message: "Success",
      ...paginatedResponse,
    };
  }, {
    query: t.Object({
      cursor: t.Optional(t.String()),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 50, default: 10 })),
    }),
    detail: {
      tags: ["Work"],
      summary: "Get all work experience",
      description: "Get paginated list of work experience records",
    }
  })