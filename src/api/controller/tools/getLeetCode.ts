import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface LeetCodeSubmitStat {
  difficulty: string;
  count: number;
  submissions: number;
}

interface LeetCodeContestRanking {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number;
  totalParticipants: number;
  topPercentage: number;
}

interface LeetCodeGraphQLResponse {
  data: {
    matchedUser: {
      username: string;
      profile: {
        ranking: number;
        reputation: number;
        starRating: number;
      };
      submitStats: {
        acSubmissionNum: LeetCodeSubmitStat[];
      };
    } | null;
    userContestRanking: LeetCodeContestRanking | null;
  };
  errors?: { message: string }[];
}

const LEETCODE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
        starRating
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
    }
  }
`;

async function getLeetCodeStats(username: string) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com",
    },
    body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username } }),
  });

  if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`);

  const json: LeetCodeGraphQLResponse = await res.json();

  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data.matchedUser) throw new Error("User not found");

  const { matchedUser: user, userContestRanking: contest } = json.data;
  const stats = user.submitStats.acSubmissionNum;

  const getStat = (diff: string) =>
    stats.find((s) => s.difficulty === diff)?.count ?? 0;

  return {
    username: user.username,
    ranking: user.profile.ranking,
    reputation: user.profile.reputation,
    starRating: user.profile.starRating,
    solved: {
      total: getStat("All"),
      easy: getStat("Easy"),
      medium: getStat("Medium"),
      hard: getStat("Hard"),
    },
    contest: contest
      ? {
          attended: contest.attendedContestsCount,
          rating: Math.round(contest.rating),
          globalRanking: contest.globalRanking,
          totalParticipants: contest.totalParticipants,
          topPercentage: contest.topPercentage,
        }
      : null,
  };
}

export default createElysia().get(
  "/leetcode",
  async ({ query }: { query: { username: string } }) => {
    try {
      const data = await getLeetCodeStats(query.username);
      return { status: 200, message: "Success", data };
    } catch (error: any) {
      return {
        status: 400,
        message: error.message ?? "Failed to fetch LeetCode stats",
        data: null,
      };
    }
  },
  {
    query: t.Object({
      username: t.String({ minLength: 1 }),
    }),
    detail: {
      tags: ["Tools"],
      summary: "Get LeetCode stats by username",
      description:
        "Fetch LeetCode problem-solving stats and contest rating for a given username via the GraphQL API.",
    },
  },
);
