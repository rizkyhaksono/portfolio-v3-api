import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import { t } from "elysia";
import { createElysia } from "@/libs/elysia";
import { checkAiRateLimit } from "@/libs/aiRateLimit";
import { retrievePortfolioContextWithSources } from "@/libs/rag";
import { runWithTools, SYSTEM_INSTRUCTION, GEMINI_MODEL } from "@/libs/geminiChat";
import { getClientIp } from "@/utils/clientIp";

/**
 * Grounded Q&A over the portfolio (the "Ask my resume" home widget). Uses RAG context
 * when available AND the portfolio function-calling tools, so it can always answer from
 * live project/work/education data even if the embedding index is empty. Returns the
 * answer plus the retrieved sources. Rate-limited per client IP.
 */
export default createElysia().post(
  "/ask",
  async ({
    body,
    request,
    server,
    set,
  }: {
    body: { question: string };
    request: Request;
    server: any;
    set: { status?: number };
  }) => {
    if (!process.env.GENERATIVE_AI_API_KEY) {
      set.status = 500;
      return { status: 500, message: "AI is not configured", data: null };
    }

    const ip = getClientIp(request, server);
    const rateCheck = checkAiRateLimit(`ip-ask:${ip}`);
    if (!rateCheck.allowed) {
      set.status = 429;
      return {
        status: 429,
        message: `Rate limit exceeded. Retry in ${rateCheck.retryAfterSeconds ?? 60}s.`,
        data: null,
      };
    }

    const { text: context, sources } = await retrievePortfolioContextWithSources(body.question).catch(
      () => ({ text: "", sources: [] })
    );

    const augmented = context
      ? `${body.question}\n\n[Portfolio context]\n${context}\n\nAnswer using the context above and the portfolio tools. Be concise (2-4 sentences).`
      : `${body.question}\n\nUse the portfolio tools (get_projects, get_work_experience, get_education) to answer from real data. Be concise (2-4 sentences).`;

    const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    const contents: Content[] = [{ role: "user", parts: [{ text: augmented }] }];

    let answer: string;
    try {
      const result = await runWithTools(model, contents, 2);
      answer = result.text;
    } catch {
      set.status = 502;
      return { status: 502, message: "AI request failed. Please try again.", data: null };
    }

    return { status: 200, message: "Success", data: { answer, sources } };
  },
  {
    body: t.Object({ question: t.String({ minLength: 1, maxLength: 300 }) }),
    detail: {
      tags: ["AI"],
      summary: "Ask my resume (grounded RAG + tools answer)",
      description: "Public, rate-limited, single-shot grounded answer over portfolio content with cited sources.",
    },
  }
);
