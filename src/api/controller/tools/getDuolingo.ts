import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface DuolingoUser {
  username: string;
  name: string;
  streak: number;
  totalXp: number;
  lingots: number;
  gems: number;
  courses: DuolingoCourse[];
}

interface DuolingoCourse {
  language: string;
  level: number;
  xp: number;
  skills: number;
  wordsLearned: number;
  progress: number;
}

async function getDuolingoUserData(username: string): Promise<DuolingoUser> {
  try {
    const response = await fetch(`https://www.duolingo.com/2017-06-30/users?username=${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) throw new Error("Failed to fetch Duolingo user data");

    const data = await response.json();
    const user = data.users[0];

    if (!user) throw new Error("User not found");

    return {
      username: user.username,
      name: user.name,
      streak: user.streak,
      totalXp: user.totalXp,
      lingots: user.lingots || 0,
      gems: user.gems || 0,
      courses: user.courses?.map((course: any) => ({
        language: course.title,
        level: course.crowns || 0,
        xp: course.xp || 0,
        skills: course.skills?.length || 0,
        wordsLearned: course.wordsLearned || 0,
        progress: course.xp > 0 ? Math.round((course.xp / (course.crowns * 1000)) * 100) : 0,
      })) || [],
    };
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch Duolingo data");
  }
}

async function getDailyGoal(username: string) {
  try {
    const response = await fetch(`https://www.duolingo.com/2017-06-30/users?username=${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) throw new Error("Failed to fetch daily goal data");

    const data = await response.json();
    const user = data.users[0];

    return {
      dailyGoal: user.dailyGoal || 10,
      xpToday: user.xpGains?.[0]?.xp || 0,
      goalMet: (user.xpGains?.[0]?.xp || 0) >= (user.dailyGoal || 10),
      streak: user.streak,
    };
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch daily goal data");
  }
}

export default createElysia()
  .get("/profile", async ({
    query
  }: {
    query: {
      username: string;
    };
  }) => {
    const { username } = query;

    if (!username) {
      return {
        success: false,
        error: "Username is required",
      };
    }

    try {
      const userData = await getDuolingoUserData(username);

      return {
        success: true,
        data: userData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch Duolingo profile",
      };
    }
  }, {
    query: t.Object({
      username: t.String(),
    }),
    detail: {
      tags: ["Duolingo"],
      summary: "Get Duolingo user profile",
      description: "Retrieves user profile, streak, XP, and course progress",
    },
  })
  .get("/daily-goal", async ({
    query
  }: {
    query: {
      username: string;
    };
  }) => {
    const { username } = query;

    if (!username) {
      return {
        success: false,
        error: "Username is required",
      };
    }

    try {
      const goalData = await getDailyGoal(username);

      return {
        success: true,
        data: goalData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch daily goal",
      };
    }
  }, {
    query: t.Object({
      username: t.String(),
    }),
    detail: {
      tags: ["Duolingo"],
      summary: "Get daily goal progress",
      description: "Retrieves daily XP goal and progress",
    },
  })

  .get("/streak", async ({
    query
  }: {
    query: {
      username: string;
    };
  }) => {
    const { username } = query;

    if (!username) {
      return {
        success: false,
        error: "Username is required",
      };
    }

    try {
      const userData = await getDuolingoUserData(username);

      return {
        success: true,
        data: {
          username: userData.username,
          streak: userData.streak,
          totalXp: userData.totalXp,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch streak data",
      };
    }
  }, {
    query: t.Object({
      username: t.String(),
    }),
    detail: {
      tags: ["Duolingo"],
      summary: "Get current streak",
      description: "Retrieves current learning streak",
    },
  });
