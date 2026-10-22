import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import {
  BadGatewayException,
  InternalServerErrorException,
  NotFoundException,
  TooManyRequestsException,
} from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { checkAiRateLimit, checkUserDailyBudget, refundUserDailyBudget } from "@/libs/aiRateLimit";
import { retrievePortfolioContext } from "@/libs/rag";
import { streamWithTools, SYSTEM_INSTRUCTION, GEMINI_MODEL, GENERATION_CONFIG, toFriendlyAiError } from "@/libs/geminiChat";
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
      if (!checkUserDailyBudget(user.id).allowed) {
        throw new TooManyRequestsException("You've reached today's Etan AI limit. It resets at 00:00 UTC.");
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

      let reply: AsyncGenerator<string, void>;
      let firstChunk: string;
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

        // Pull the first chunk here so tool-round and Gemini errors still reach onError.
        reply = streamWithTools(model, contents);
        const first = await reply.next();
        if (first.done) throw new BadGatewayException("The reply was cut off. Please try a shorter question.");
        firstChunk = first.value;
      } catch (err) {
        refundUserDailyBudget(user.id, err);
        // Roll back this turn so a failure leaves no orphan user message or empty new chat.
        await prismaClient.aIChatMessage
          .delete({ where: { id: userMessage.id } })
          .then(() => (existingChat ? null : prismaClient.aIChat.delete({ where: { id: chatRecord.id } })))
          .catch((rollbackErr: unknown) => logger.error({ err: rollbackErr }, "AI chat rollback failed"));
        throw toFriendlyAiError(err);
      }

      const saveReply = (msg: string) =>
        prismaClient.aIChatMessage
          .create({ data: { msg, role: "model", aIChatId: chatRecord.id } })
          .catch((err: unknown) => logger.error({ err }, "AI chat reply save failed"));
      // Manual next() calls (not for-await) so leaving this loop never closes `reply`.
      const readRest = async function* () {
        for (let next = await reply.next(); !next.done; next = await reply.next()) yield next.value;
      };

      // Returned (not a generator handler) because Elysia skips onError for errors a
      // generator throws before its first yield, turning every 404/429/502 into a 500.
      return (async function* () {
        let fullResponse = firstChunk;
        let saved = false;
        try {
          yield firstChunk;
          try {
            for await (const piece of readRest()) {
              fullResponse += piece;
              yield piece;
            }
          } catch (err) {
            logger.error({ err }, "AI chat stream failed mid-reply; saving the partial reply");
          }
          saved = true;
          await saveReply(fullResponse);
          yield `\n<!--chatId:${chatRecord.id}-->`;
        } finally {
          // The client disconnected mid-reply: finish reading so the saved turn is complete.
          if (!saved) {
            try {
              for await (const piece of readRest()) fullResponse += piece;
            } catch {
              // keep what arrived
            }
            await saveReply(fullResponse);
          }
        }
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
