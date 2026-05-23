import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { indexPortfolioContent } from "@/libs/rag";
import { InternalServerErrorException } from "@/constants/exceptions";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .post("/reindex", async () => {
    if (!process.env.GENERATIVE_AI_API_KEY) {
      throw new InternalServerErrorException("GENERATIVE_AI_API_KEY is not configured");
    }
    const result = await indexPortfolioContent();
    return { status: 200, data: result };
  }, {
    detail: {
      tags: ["AI"],
      summary: "Re-index portfolio for RAG",
      description: "Rebuild embedding index from projects, work, and education.",
    },
  });
