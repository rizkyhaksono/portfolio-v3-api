import { createElysia } from "@/libs/elysia";
import { LINKEDIN_RECOMMENDATIONS_DATA } from "@/constants/linkedin";

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
  });
