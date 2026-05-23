import { GoogleGenerativeAI } from "@google/generative-ai";
import { prismaClient } from "@/libs/prismaDatabase";

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

  const [projects, works, educations] = await Promise.all([
    prismaClient.project.findMany(),
    prismaClient.work.findMany(),
    prismaClient.education.findMany(),
  ]);

  const chunks: { sourceType: string; sourceId: string; content: string }[] = [];

  for (const p of projects) {
    chunks.push({
      sourceType: "project",
      sourceId: p.id,
      content: `Project: ${p.title}\n${p.description}\n${p.content}`,
    });
  }
  for (const w of works) {
    chunks.push({
      sourceType: "work",
      sourceId: w.id,
      content: `Work: ${w.jobTitle} at ${w.instance}\n${w.content}\n${w.duration}`,
    });
  }
  for (const e of educations) {
    chunks.push({
      sourceType: "education",
      sourceId: e.id,
      content: `Education: ${e.instance}\n${e.content}\n${e.duration}`,
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

export async function retrievePortfolioContext(query: string): Promise<string> {
  const apiKey = process.env.GENERATIVE_AI_API_KEY;
  if (!apiKey) return "";

  const rows = await prismaClient.portfolioEmbedding.findMany();
  if (rows.length === 0) {
    await indexPortfolioContent().catch(() => undefined);
    const refreshed = await prismaClient.portfolioEmbedding.findMany();
    if (refreshed.length === 0) return "";
    return rankAndFormat(query, refreshed);
  }

  return rankAndFormat(query, rows);
}

async function rankAndFormat(
  query: string,
  rows: { content: string; embedding: unknown; sourceType: string; sourceId: string }[]
): Promise<string> {
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

  if (scored.length === 0 || scored[0]!.score < 0.3) return "";

  return scored
    .map(
      (s, i) =>
        `[Source ${i + 1}: ${s.sourceType}/${s.sourceId}]\n${s.content}`
    )
    .join("\n\n---\n\n");
}
