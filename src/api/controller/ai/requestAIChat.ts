import { GoogleGenerativeAI } from "@google/generative-ai";
import { createElysia } from "@/lib/elysia";
import aiModel from "@/models/ai.model";

const genAI = new GoogleGenerativeAI(Bun.env.GENERATIVE_AI_API_KEY ?? "")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

export default createElysia()
  .use(aiModel)
  .post("/", async ({ body }) => {
    const { text } = body
    return await model.generateContent(text)
  }, {
    body: "ai.model",
    detail: {
      tags: ["AI"]
    }
  })