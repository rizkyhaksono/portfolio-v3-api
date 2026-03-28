import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface CodeforcesUser {
  handle: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  organization?: string;
  contribution: number;
  rank: string;
  rating: number;
  maxRank: string;
  maxRating: number;
  lastOnlineTimeSeconds: number;
  registrationTimeSeconds: number;
  friendOfCount: number;
  avatar: string;
}

interface CodeforcesSubmission {
  creationTimeSeconds: number;
  problem: {
    name: string;
    rating?: number;
    tags: string[];
  };
  verdict?: string;
  programmingLanguage: string;
}

interface CodeforcesApiResponse<T> {
  status: string;
  result: T;
  comment?: string;
}

async function fetchUser(handle: string): Promise<CodeforcesUser> {
  const res = await fetch(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
  );

  if (!res.ok) throw new Error(`Codeforces API error: ${res.status}`);

  const json: CodeforcesApiResponse<CodeforcesUser[]> = await res.json();
  if (json.status !== "OK") throw new Error(json.comment ?? "User not found");

  return json.result[0];
}

async function fetchRecentSubmissions(
  handle: string,
  count: number,
): Promise<CodeforcesSubmission[]> {
  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=${count}`,
  );

  if (!res.ok) return [];

  const json: CodeforcesApiResponse<CodeforcesSubmission[]> = await res.json();
  return json.status === "OK" ? json.result : [];
}

export default createElysia().get(
  "/codeforces",
  async ({
    query,
  }: {
    query: { handle: string; recentCount?: string };
  }) => {
    const count = Math.min(parseInt(query.recentCount ?? "10"), 20);

    try {
      const [user, submissions] = await Promise.all([
        fetchUser(query.handle),
        fetchRecentSubmissions(query.handle, count),
      ]);

      return {
        status: 200,
        message: "Success",
        data: {
          handle: user.handle,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          country: user.country ?? null,
          organization: user.organization ?? null,
          rank: user.rank,
          rating: user.rating,
          maxRank: user.maxRank,
          maxRating: user.maxRating,
          contribution: user.contribution,
          friendOfCount: user.friendOfCount,
          avatar: user.avatar,
          registeredAt: new Date(user.registrationTimeSeconds * 1000).toISOString(),
          lastOnlineAt: new Date(user.lastOnlineTimeSeconds * 1000).toISOString(),
          recentSubmissions: submissions.map((s) => ({
            problemName: s.problem.name,
            problemRating: s.problem.rating ?? null,
            tags: s.problem.tags,
            verdict: s.verdict ?? "UNKNOWN",
            language: s.programmingLanguage,
            submittedAt: new Date(s.creationTimeSeconds * 1000).toISOString(),
          })),
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        message: error.message ?? "Failed to fetch Codeforces stats",
        data: null,
      };
    }
  },
  {
    query: t.Object({
      handle: t.String({ minLength: 1 }),
      recentCount: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Tools"],
      summary: "Get Codeforces stats by handle",
      description:
        "Fetch Codeforces user rating, rank, and recent submission history via the official REST API.",
    },
  },
);
