import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import { t } from "elysia";
import {
  InternalServerErrorException,
  TooManyRequestsException,
} from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import { checkAiRateLimit } from "@/libs/aiRateLimit";
import { retrievePortfolioContextWithSources } from "@/libs/rag";
import { runWithTools, SYSTEM_INSTRUCTION, GEMINI_MODEL } from "@/libs/geminiChat";
import { getClientIp } from "@/utils/clientIp";

/**
 * Public, anonymous, single-turn portfolio chat. No auth, no persistence. Rate-limited
 * per client IP. Streams the answer, then emits a trailing `<!--meta:{...}-->` sentinel
 * with the RAG sources and the tool calls the agent made, so the UI can show citations
 * and the agentic tool-use loop.
 */
export default createElysia().post(
  "/public",
  async function* ({
    body,
    request,
    server,
  }: {
    body: { text: string };
    request: Request;
    server: any;
  }) {
    if (!process.env.GENERATIVE_AI_API_KEY) {
      throw new InternalServerErrorException("GENERATIVE_AI_API_KEY is not configured");
    }

    const ip = getClientIp(request, server);
    const rateCheck = checkAiRateLimit(`ip:${ip}`);
    if (!rateCheck.allowed) {
      throw new TooManyRequestsException(
        `Rate limit exceeded. Retry in ${rateCheck.retryAfterSeconds ?? 60} seconds.`
      );
    }

    const { text } = body;
    const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const { text: portfolioContext, sources } = await retrievePortfolioContextWithSources(text).catch(
      () => ({ text: "", sources: [] })
    );
    const augmentedText = portfolioContext
      ? `${text}\n\n[Portfolio context]\n${portfolioContext}`
      : text;

    const contents: Content[] = [{ role: "user", parts: [{ text: augmentedText }] }];

    let fullResponse: string;
    let toolCalls: { name: string; args: Record<string, unknown> }[] = [];
    try {
      // Public path is capped at 2 tool rounds to bound cost/abuse.
      const result = await runWithTools(model, contents, 2);
      fullResponse = result.text;
      toolCalls = result.toolCalls;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `AI model "${GEMINI_MODEL}" request failed. Details: ${detail}`
      );
    }

    const chunkSize = 4;
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      yield fullResponse.slice(i, i + chunkSize);
      await new Promise((r) => setTimeout(r, 12));
    }

    const meta = {
      sources,
      tools: toolCalls.map((c) => ({ name: c.name, args: c.args })),
    };
    yield `\n<!--meta:${JSON.stringify(meta)}-->`;
  },
  {
    body: t.Object({ text: t.String({ minLength: 1, maxLength: 600 }) }),
    detail: {
      tags: ["AI"],
      summary: "Public AI Chat (anonymous, single-turn)",
      description:
        "Public, rate-limited, single-turn portfolio chat with RAG + tool transparency. No auth, no persistence.",
    },
  }
);
