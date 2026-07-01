import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import {
  InternalServerErrorException,
  TooManyRequestsException,
} from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { checkAiRateLimit } from "@/libs/aiRateLimit";
import { retrievePortfolioContext } from "@/libs/rag";
import { runWithTools, SYSTEM_INSTRUCTION, GEMINI_MODEL } from "@/libs/geminiChat";

const MAX_HISTORY = 20;

export default createElysia()
  .use(aiModel)
  .use(authGuard)
  .post(
    "/",
    async function* ({
      body,
      user,
    }: {
      body: { text: string; chatId?: string };
      user: { id: string };
    }) {
      if (!process.env.GENERATIVE_AI_API_KEY) {
        throw new InternalServerErrorException("GENERATIVE_AI_API_KEY is not configured");
      }

      const rateCheck = checkAiRateLimit(user.id);
      if (!rateCheck.allowed) {
        throw new TooManyRequestsException(
          `Rate limit exceeded. Retry in ${rateCheck.retryAfterSeconds ?? 60} seconds.`
        );
      }

      const { text, chatId } = body;
      const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_AI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      let chatRecord = chatId
        ? await prismaClient.aIChat.findFirst({
            where: { id: chatId, userId: user.id },
          })
        : null;

      if (chatId && !chatRecord) {
        throw new InternalServerErrorException("Chat session not found");
      }

      if (!chatRecord) {
        chatRecord = await prismaClient.aIChat.create({
          data: {
            userId: user.id,
            chatTitle: text.slice(0, 80),
          },
        });
      }

      await prismaClient.aIChatMessage.create({
        data: { msg: text, role: "user", aIChatId: chatRecord.id },
      });

      // History (most-recent MAX_HISTORY, restored to chronological order) and RAG
      // context are independent — fetch them concurrently. Ordering asc instead of
      // desc+reverse would freeze context at the oldest 20 once a chat grows.
      const [recentMessages, portfolioContext] = await Promise.all([
        prismaClient.aIChatMessage.findMany({
          where: { aIChatId: chatRecord.id },
          orderBy: { createdAt: "desc" },
          take: MAX_HISTORY,
        }),
        retrievePortfolioContext(text).catch(() => ""),
      ]);
      const priorMessages = recentMessages.reverse();
      const augmentedText = portfolioContext
        ? `${text}\n\n[Portfolio context]\n${portfolioContext}`
        : text;

      const history: Content[] = priorMessages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.msg }],
      }));

      // Gemini requires the conversation to begin with a user turn. Once the
      // most-recent window starts mid-exchange it can lead with a model message,
      // so drop any leading model turns.
      while (history.length > 0 && history[0].role !== "user") {
        history.shift();
      }

      const contents: Content[] = [
        ...history,
        { role: "user", parts: [{ text: augmentedText }] },
      ];

      let fullResponse: string;
      try {
        const { text: generated } = await runWithTools(model, contents);
        fullResponse = generated;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new InternalServerErrorException(
          `AI model "${GEMINI_MODEL}" request failed. Verify GENERATIVE_AI_API_KEY is valid and the model is accessible. Details: ${detail}`
        );
      }

      // Stream in small chunks so the client renders a visible, ChatGPT-like
      // typing effect (a smaller chunk + slight delay reads as natural typing).
      const chunkSize = 4;
      for (let i = 0; i < fullResponse.length; i += chunkSize) {
        const piece = fullResponse.slice(i, i + chunkSize);
        yield piece;
        await new Promise((r) => setTimeout(r, 12));
      }

      await prismaClient.aIChatMessage.create({
        data: {
          msg: fullResponse,
          role: "model",
          aIChatId: chatRecord.id,
        },
      });

      yield `\n<!--chatId:${chatRecord.id}-->`;
    },
    {
      body: "ai.model",
      detail: {
        tags: ["AI"],
        summary: "Request AI Chat Generation",
        description:
          "Stream AI chat with multi-turn history, RAG context, and portfolio tools.",
      },
    }
  );
