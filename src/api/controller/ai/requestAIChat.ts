import { GoogleGenerativeAI } from "@google/generative-ai";
import { InternalServerErrorException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";

const genAI = new GoogleGenerativeAI(Bun.env.GENERATIVE_AI_API_KEY ?? "")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

export default createElysia()
  .use(aiModel)
  .post("/", async ({ body }) => {
    const { text } = body;
    const result = await model.generateContent(text);
    if (result?.response?.candidates) {
      return {
        status: 200,
        data: result.response.candidates[0]?.content?.parts?.map((part: any) => part.text).join(" ")
      };
    }
    return new InternalServerErrorException("Failed to generate content");
  }, {
    body: "ai.model",
    detail: {
      tags: ["AI"]
    }
  })