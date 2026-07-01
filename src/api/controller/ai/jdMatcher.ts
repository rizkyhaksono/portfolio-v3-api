import { GoogleGenerativeAI } from "@google/generative-ai";
import { t } from "elysia";
import { createElysia } from "@/libs/elysia";
import { checkAiRateLimit } from "@/libs/aiRateLimit";
import { retrievePortfolioContextWithSources } from "@/libs/rag";
import { GEMINI_MODEL } from "@/libs/geminiChat";
import { getSupabaseProjects, getSupabaseCareers, getSupabaseEducations } from "@/libs/supabaseData";
import { getClientIp } from "@/utils/clientIp";

interface JdFitResult {
  fitScore: number;
  verdict: string;
  matchingSkills: string[];
  matchingProjects: string[];
  gaps: string[];
  summary: string;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
}

function coerceResult(raw: Record<string, unknown>): JdFitResult {
  let score = Number(raw.fitScore);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    fitScore: score,
    verdict: typeof raw.verdict === "string" ? raw.verdict.slice(0, 120) : "",
    matchingSkills: strArray(raw.matchingSkills),
    matchingProjects: strArray(raw.matchingProjects),
    gaps: strArray(raw.gaps),
    summary: typeof raw.summary === "string" ? raw.summary.slice(0, 1500) : "",
  };
}

/** Recruiter JD-fit matcher: grounds Gemini in the full portfolio (Supabase + RAG) and returns
 * a structured fit analysis as JSON. Public, rate-limited per client IP. */
export default createElysia().post(
  "/jd-fit",
  async ({
    body,
    request,
    server,
    set,
  }: {
    body: { jobDescription: string };
    request: Request;
    server: any;
    set: { status?: number };
  }) => {
    if (!process.env.GENERATIVE_AI_API_KEY) {
      set.status = 500;
      return { status: 500, message: "AI is not configured", data: null };
    }

    const ip = getClientIp(request, server);
    const rate = checkAiRateLimit(`ip-jd:${ip}`);
    if (!rate.allowed) {
      set.status = 429;
      return { status: 429, message: `Rate limit exceeded. Retry in ${rate.retryAfterSeconds ?? 60}s.`, data: null };
    }

    const jd = body.jobDescription.trim();

    const [rag, projects, careers, educations] = await Promise.all([
      retrievePortfolioContextWithSources(jd).catch(() => ({ text: "", sources: [] as { sourceType: string; sourceId: string; score: number }[] })),
      getSupabaseProjects().catch(() => []),
      getSupabaseCareers().catch(() => []),
      getSupabaseEducations().catch(() => []),
    ]);

    const profile = [
      "## Work experience",
      ...careers.map((c) => `- ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ""}${c.duration ? ` (${c.duration})` : ""}`),
      "## Projects",
      ...projects.map((p) => `- ${p.title}${p.description ? `: ${p.description}` : ""}`),
      "## Education",
      ...educations.map((e) => `- ${e.title}${e.subtitle ? ` — ${e.subtitle}` : ""}`),
      rag.text ? `## Additional context\n${rag.text}` : "",
    ].join("\n");

    const prompt = `You are evaluating how well Rizky Haksono fits a job description, using ONLY the profile below. Be honest — do not invent experience.

[JOB DESCRIPTION]
${jd}

[RIZKY'S PROFILE]
${profile}

Return ONLY a JSON object with EXACTLY these keys:
- "fitScore": integer 0-100 (overall fit)
- "verdict": one short phrase (e.g. "Strong match", "Partial match", "Stretch")
- "matchingSkills": array of strings — skills/tech from the JD that Rizky clearly has
- "matchingProjects": array of strings — project or experience titles that are relevant
- "gaps": array of strings — notable JD requirements not evidenced in the profile
- "summary": 2-3 sentence recruiter-facing summary`;

    let result: JdFitResult;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_AI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      });
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      result = coerceResult(parsed);
    } catch {
      set.status = 502;
      return { status: 502, message: "Could not analyze the job description. Please try again.", data: null };
    }

    return { status: 200, message: "Success", data: { ...result, sources: rag.sources } };
  },
  {
    body: t.Object({ jobDescription: t.String({ minLength: 20, maxLength: 6000 }) }),
    detail: {
      tags: ["AI"],
      summary: "Recruiter JD-fit matcher",
      description: "Analyze how the portfolio fits a pasted job description. Public, rate-limited, returns structured JSON.",
    },
  },
);
