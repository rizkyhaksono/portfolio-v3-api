import { createElysia } from "@/libs/elysia";
import { LINKEDIN_RECOMMENDATIONS_DATA } from "@/constants/linkedin";
import { LINKEDIN_CERTIFICATIONS_DATA } from "@/constants/certifications";

export default createElysia()
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
  .get("/certifications", async () => {
    const data = LINKEDIN_CERTIFICATIONS_DATA;
    const url = new URLSearchParams();
    const page = parseInt(url.get("page") || "1");
    const limit = parseInt(url.get("limit") || "10");
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      success: true,
      data: data.slice(start, end),
      total: data.length,
      page,
      limit,
    };
  }, {
    detail: {
      tags: ["LinkedIn"],
      summary: "Get LinkedIn certifications",
      description: "Retrieves certifications from LinkedIn profile",
    },
  });
