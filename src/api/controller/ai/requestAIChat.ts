import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import {
  InternalServerErrorException,
  NotFoundException,
  TooManyRequestsException,
} from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { checkAiRateLimit } from "@/libs/aiRateLimit";
import { retrievePortfolioContext } from "@/libs/rag";
import { runWithTools, SYSTEM_INSTRUCTION, GEMINI_MODEL, GENERATION_CONFIG, toFriendlyAiError } from "@/libs/geminiChat";
import logger from "@/libs/lokiLogger";

const MAX_HISTORY = 20;

export default createElysia()
  .use(aiModel)
  .use(authGuard)
  .post(
    "/",
    async ({
      body,
      user,
    }: {
      body: { text: string; chatId?: string };
      user: { id: string };
    }) => {
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
        generationConfig: GENERATION_CONFIG,
      });

      const existingChat = chatId
        ? await prismaClient.aIChat.findFirst({
            where: { id: chatId, userId: user.id },
          })
        : null;

      if (chatId && !existingChat) {
        throw new NotFoundException("Chat session not found");
      }

      const chatRecord =
        existingChat ??
        (await prismaClient.aIChat.create({
          data: {
            userId: user.id,
            chatTitle: text.slice(0, 80),
          },
        }));

      const userMessage = await prismaClient.aIChatMessage.create({
        data: { msg: text, role: "user", aIChatId: chatRecord.id },
      });

      let fullResponse: string;
      try {
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

        // Older chats may hold empty model replies; Gemini rejects empty text parts.
        const history: Content[] = priorMessages
          .slice(0, -1)
          .filter((m) => m.msg.trim())
          .map((m) => ({
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

        // runWithTools throws on an empty/cut-off reply, so an empty reply is never saved.
        ({ text: fullResponse } = await runWithTools(model, contents));

        // Save before streaming so a client abort mid-stream still leaves a complete turn.
        await prismaClient.aIChatMessage.create({
          data: {
            msg: fullResponse,
            role: "model",
            aIChatId: chatRecord.id,
          },
        });
      } catch (err) {
        // Roll back this turn so a failure leaves no orphan user message or empty new chat.
        await prismaClient.aIChatMessage
          .delete({ where: { id: userMessage.id } })
          .then(() => (existingChat ? null : prismaClient.aIChat.delete({ where: { id: chatRecord.id } })))
          .catch((rollbackErr: unknown) => logger.error({ err: rollbackErr }, "AI chat rollback failed"));
        throw toFriendlyAiError(err);
      }

      // Stream in small chunks so the client renders a visible, ChatGPT-like
      // typing effect (a smaller chunk + slight delay reads as natural typing).
      // Returned (not a generator handler) because Elysia skips onError for errors a
      // generator throws before its first yield, turning every 404/429/502 into a 500.
      return (async function* () {
        const chunkSize = 4;
        for (let i = 0; i < fullResponse.length; i += chunkSize) {
          const piece = fullResponse.slice(i, i + chunkSize);
          yield piece;
          await new Promise((r) => setTimeout(r, 12));
        }

        yield `\n<!--chatId:${chatRecord.id}-->`;
      })();
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
