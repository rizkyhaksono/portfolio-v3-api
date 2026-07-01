import { GoogleGenerativeAI } from "@google/generative-ai";
import { prismaClient } from "@/libs/prismaDatabase";
import { getSupabaseProjects, getSupabaseCareers, getSupabaseEducations } from "@/libs/supabaseData";

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";
const TOP_K = 5;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GENERATIVE_AI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function indexPortfolioContent(): Promise<{ indexed: number }> {
  const apiKey = process.env.GENERATIVE_AI_API_KEY;
  if (!apiKey) return { indexed: 0 };

  const [projects, careers, educations] = await Promise.all([
    getSupabaseProjects(),
    getSupabaseCareers(),
    getSupabaseEducations(),
  ]);

  const chunks: { sourceType: string; sourceId: string; content: string }[] = [];

  for (const p of projects) {
    chunks.push({
      sourceType: "project",
      sourceId: p.id,
      content: `Project: ${p.title}\n${p.description ?? ""}`,
    });
  }
  for (const c of careers) {
    chunks.push({
      sourceType: "work",
      sourceId: c.id,
      content: `Work experience: ${c.title}\n${c.subtitle ?? ""}\n${c.duration ?? ""}`,
    });
  }
  for (const e of educations) {
    chunks.push({
      sourceType: "education",
      sourceId: e.id,
      content: `Education: ${e.title}\n${e.subtitle ?? ""}\n${e.duration ?? ""}`,
    });
  }

  let indexed = 0;
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    await prismaClient.portfolioEmbedding.upsert({
      where: {
        sourceType_sourceId: {
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
        },
      },
      create: {
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        content: chunk.content,
        embedding,
      },
      update: {
        content: chunk.content,
        embedding,
      },
    });
    indexed++;
  }

  return { indexed };
}

export interface RetrievedSource {
  sourceType: string;
  sourceId: string;
  score: number;
}

export async function retrievePortfolioContextWithSources(
  query: string
): Promise<{ text: string; sources: RetrievedSource[] }> {
  const apiKey = process.env.GENERATIVE_AI_API_KEY;
  if (!apiKey) return { text: "", sources: [] };

  let rows = await prismaClient.portfolioEmbedding.findMany();
  if (rows.length === 0) {
    await indexPortfolioContent().catch(() => undefined);
    rows = await prismaClient.portfolioEmbedding.findMany();
    if (rows.length === 0) return { text: "", sources: [] };
  }

  return rankAndFormat(query, rows);
}

export async function retrievePortfolioContext(query: string): Promise<string> {
  const { text } = await retrievePortfolioContextWithSources(query);
  return text;
}

async function rankAndFormat(
  query: string,
  rows: { content: string; embedding: unknown; sourceType: string; sourceId: string }[]
): Promise<{ text: string; sources: RetrievedSource[] }> {
  const queryEmbedding = await embedText(query);
  const scored = rows
    .map((row) => {
      const vec = row.embedding as number[];
      return {
        ...row,
        score: cosineSimilarity(queryEmbedding, vec),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  if (scored.length === 0 || scored[0]!.score < 0.3) return { text: "", sources: [] };

  const text = scored
    .map((s, i) => `[Source ${i + 1}: ${s.sourceType}/${s.sourceId}]\n${s.content}`)
    .join("\n\n---\n\n");
  const sources: RetrievedSource[] = scored.map((s) => ({
    sourceType: s.sourceType,
    sourceId: s.sourceId,
    score: s.score,
  }));

  return { text, sources };
}
