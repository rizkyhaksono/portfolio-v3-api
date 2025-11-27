import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import {
  pageBasedPaginationQuerySchema,
  createPageBasedPaginatedResponse,
  PageBasedPaginationQuery,
} from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

export default createElysia()
  .use(paginationModel)
  .get("/", async ({
    query
  }: {
    query: PageBasedPaginationQuery;
  }) => {
    const { page, limit } = pageBasedPaginationQuerySchema.parse(query);

    // Get total count
    const total = await prismaClient.education.count();

    // Calculate offset
    const offset = (page - 1) * limit;

    // Fetch paginated education records
    const education = await prismaClient.education.findMany({
      orderBy: {
        created_at: "desc",
      },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const prev = page > 1 ? page - 1 : null;
    const next = page < totalPages ? page + 1 : null;

    return {
      status: 200,
      message: "Success",
      data: education,
      page,
      limit,
      total,
      totalPages,
      prev,
      next,
    };
  }, {
    query: "pagination.page-based.query.model",
    detail: {
      tags: ["Education"],
      summary: "Get all education",
      description: "Get paginated list of education records",
    }
  })