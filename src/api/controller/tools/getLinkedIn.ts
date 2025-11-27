import { createElysia } from "@/libs/elysia";
import { LINKEDIN_RECOMMENDATIONS_DATA } from "@/constants/linkedin";
import { LINKEDIN_CERTIFICATIONS_DATA } from "@/constants/certifications";
import {
  pageBasedPaginationQuerySchema,
  createPageBasedPaginatedResponse,
  PageBasedPaginationQuery
} from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

export default createElysia()
  .use(paginationModel)
  .get("/recommendations", async () => {
    return {
      success: true,
      data: LINKEDIN_RECOMMENDATIONS_DATA,
      total: LINKEDIN_RECOMMENDATIONS_DATA.length,
    };
  }, {
    detail: {
      tags: ["LinkedIn"],
      summary: "Get LinkedIn recommendations",
      description: "Retrieves recommendations and endorsements from LinkedIn profile",
    },
  })
  .get("/certifications", async ({
    query
  }: {
    query: PageBasedPaginationQuery
  }) => {
    const { page, limit } = pageBasedPaginationQuerySchema.parse(query);

    // Sort by date (descending), then by ID (ascending) for consistent ordering
    const sortedCertifications = [...LINKEDIN_CERTIFICATIONS_DATA].sort((a, b) => {
      const dateDiff = b.issued.getTime() - a.issued.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id - b.id;
    });

    const paginatedResponse = createPageBasedPaginatedResponse(
      sortedCertifications,
      page,
      limit
    );

    return {
      success: true,
      ...paginatedResponse,
    };
  }, {
    query: "pagination.page-based.query.model",
    detail: {
      tags: ["LinkedIn"],
      summary: "Get LinkedIn certifications",
      description: "Retrieves paginated certifications from LinkedIn profile",
    },
  });
