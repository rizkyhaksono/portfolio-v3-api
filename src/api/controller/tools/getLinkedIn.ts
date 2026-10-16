import { createElysia } from "@/libs/elysia";
import { LINKEDIN_RECOMMENDATIONS_DATA } from "@/constants/linkedin";
import { LINKEDIN_CERTIFICATIONS_DATA } from "@/constants/certifications";
import {
  pageBasedPaginationQuerySchema,
  createPageBasedPaginatedResponse,
  PageBasedPaginationQuery
} from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

const LINKEDIN_CERTIFICATIONS_URL = "https://www.linkedin.com/in/rizkyhaksono/details/certifications/";

// Signed media.licdn.com URLs carry an `e` expiry (unix seconds); past it LinkedIn
// answers 403 "Invalid e query string", so never hand those out.
function isExpiredLicdn(url: string | null | undefined): boolean {
  if (!url?.startsWith("https://media.licdn.com/")) return false;
  // Anything not clearly in the future (missing, non-numeric/NaN, past) counts as expired.
  return !(Number(new URL(url).searchParams.get("e")) * 1000 > Date.now());
}

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

    // Sort by date (descending), then by title — ids are random per boot, so not stable
    const sortedCertifications = LINKEDIN_CERTIFICATIONS_DATA.map((cert) => ({
      ...cert,
      link: isExpiredLicdn(cert.link) ? LINKEDIN_CERTIFICATIONS_URL : cert.link,
      image: isExpiredLicdn(cert.image) ? null : cert.image,
    })).sort((a, b) => {
      const dateDiff = b.issued.getTime() - a.issued.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.title.localeCompare(b.title);
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
