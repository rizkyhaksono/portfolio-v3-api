import { GoogleGenerativeAI } from "@google/generative-ai";
import { InternalServerErrorException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

const genAI = new GoogleGenerativeAI(Bun.env.GENERATIVE_AI_API_KEY ?? "")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

export default createElysia()
  .use(aiModel)
  // .use(authGuard)
  // .post("/", async ({ body, user }) => {
  .post("/", async ({ body }) => {
    const { text } = body;
    const result = await model.generateContent(text);
    /**
     * TODO: No auth guard for a while until the front end is ready
     */
    if (result?.response?.candidates) {
      return {
        status: 200,
        data: result.response.candidates[0]?.content?.parts?.map((part: any) => part.text).join(" ")
      };
    }
    // if (result?.response?.candidates) {
    //   const ai = await prismaClient.AIChat.create({
    //     data: {
    //       userId: user.id,
    //       chatTitle: text,
    //     }
    //   });
    //   await prismaClient.AIChatMessage.create({
    //     data: {
    //       msg: result?.response?.candidates[0]?.content?.parts?.map((part: any) => part.text).join(" "),
    //       role: result?.response?.candidates[0]?.content?.role,
    //       createdAt: new Date(),
    //       aIChatId: ai?.id,
    //     },
    //   });
    //   return {
    //     status: 200,
    //     data: result?.response?.candidates[0]?.content?.parts?.map((part: any) => part.text).join(" ")
    //   };
    // }
    return new InternalServerErrorException("Failed to generate content");
  }, {
    body: "ai.model",
    detail: {
      tags: ["AI"]
    }
  })