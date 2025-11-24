import { createElysia } from "@/libs/elysia";
import { LINKEDIN_RECOMMENDATIONS_DATA } from "@/constants/linkedin";
import { LINKEDIN_CERTIFICATIONS_DATA } from "@/constants/certifications";
import {
  paginationQuerySchema,
  createPaginatedResponse,
  parseCursorToDate,
  PaginationQuery
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
    query: PaginationQuery
  }) => {
    const { cursor, limit } = paginationQuerySchema.parse(query);
    const cursorDate = parseCursorToDate(cursor);

    const sortedCertifications = [...LINKEDIN_CERTIFICATIONS_DATA].sort(
      (a, b) => b.issued.getTime() - a.issued.getTime()
    );

    const filteredCertifications = cursorDate
      ? sortedCertifications.filter((certification) => certification.issued < cursorDate)
      : sortedCertifications;

    const paginatedResponse = createPaginatedResponse(
      filteredCertifications,
      limit,
      (certification) => certification.issued
    );

    return {
      success: true,
      data: paginatedResponse.data,
      nextCursor: paginatedResponse.nextCursor,
      hasMore: paginatedResponse.hasMore,
      total: LINKEDIN_CERTIFICATIONS_DATA.length,
    };
  }, {
    query: "pagination.query.model",
    detail: {
      tags: ["LinkedIn"],
      summary: "Get LinkedIn certifications",
      description: "Retrieves paginated certifications from LinkedIn profile",
    },
  });
