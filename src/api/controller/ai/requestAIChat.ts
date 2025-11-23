import { GoogleGenerativeAI } from "@google/generative-ai";
import { InternalServerErrorException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(aiModel)
  .use(authGuard)
  .post(
    "/",
    async function* ({ body, user }: { body: { text: string }; user: any }) {
      const genAI = new GoogleGenerativeAI(Bun.env.GENERATIVE_AI_API_KEY ?? "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const { text } = body;

      try {
        const ai = await prismaClient.aIChat.create({
          data: {
            userId: user.id,
            chatTitle: text,
          },
        });

        const result = await model.generateContentStream(text);

        let fullResponse = "";

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;

          yield chunkText;
        }

        await prismaClient.aIChatMessage.create({
          data: {
            msg: fullResponse,
            role: "model",
            createdAt: new Date(),
            aIChatId: ai.id,
          },
        });
      } catch (error) {
        console.error("Streaming error:", error);
        throw new InternalServerErrorException("Failed to generate content");
      }
    },
    {
      body: "ai.model",
      detail: {
        tags: ["AI"],
        summary: "Request AI Chat Generation",
        description: "Endpoint to request AI chat generation using Google Generative AI.",
      },
    }
  );