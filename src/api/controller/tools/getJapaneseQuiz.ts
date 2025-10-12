import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface JapaneseWord {
  word: string;
  reading: string;
  meaning: string;
  level: string;
  partOfSpeech?: string;
}

interface QuizQuestion {
  id: number;
  word: string;
  reading: string;
  options: string[];
  correct: string;
  level: string;
}

async function getVocabularyByLevel(level: string, limit: number = 10): Promise<JapaneseWord[]> {
  try {
    const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=%23jlpt-${level.toLowerCase()}`);

    if (!response.ok) throw new Error("Failed to fetch vocabulary");

    const data = await response.json();

    return data.data.slice(0, limit).map((item: any) => ({
      word: item.japanese[0]?.word || item.japanese[0]?.reading,
      reading: item.japanese[0]?.reading,
      meaning: item.senses[0]?.english_definitions?.join(", "),
      level: level,
      partOfSpeech: item.senses[0]?.parts_of_speech?.join(", "),
    }));
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch vocabulary data");
  }
}

function generateQuiz(words: JapaneseWord[], count: number = 10): QuizQuestion[] {
  const shuffled = words.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map((word, index) => {
    const wrongAnswers = shuffled
      .filter(w => w.word !== word.word)
      .slice(0, 3)
      .map(w => w.meaning);

    const options = [word.meaning, ...wrongAnswers]
      .sort(() => 0.5 - Math.random());

    return {
      id: index + 1,
      word: word.word,
      reading: word.reading,
      options,
      correct: word.meaning,
      level: word.level,
    };
  });
}

export default createElysia()
  .get("/", async () => {
    return {
      message: "Japanese Kotoba (Vocabulary) Quiz API",
      endpoints: {
        vocabulary: "GET /vocabulary?level=N5&limit=20 - Get vocabulary by JLPT level",
        quiz: "GET /quiz?level=N5&count=10 - Generate quiz questions",
        random: "GET /random?level=N5 - Get random word",
        levels: "GET /levels - Get all JLPT levels",
      },
      levels: ["N5", "N4", "N3", "N2", "N1"],
      note: "Uses Jisho API for Japanese vocabulary data",
    };
  }, {
    detail: {
      tags: ["Japanese Quiz"],
      summary: "Japanese Quiz API Information",
    },
  })

  .get("/levels", async () => {
    return {
      success: true,
      levels: [
        { code: "N5", name: "Beginner", description: "Basic vocabulary (~700 words)" },
        { code: "N4", name: "Elementary", description: "Elementary vocabulary (~1,500 words)" },
        { code: "N3", name: "Intermediate", description: "Intermediate vocabulary (~3,000 words)" },
        { code: "N2", name: "Pre-Advanced", description: "Pre-advanced vocabulary (~6,000 words)" },
        { code: "N1", name: "Advanced", description: "Advanced vocabulary (~10,000 words)" },
      ],
    };
  }, {
    detail: {
      tags: ["Japanese Quiz"],
      summary: "Get JLPT levels",
      description: "Returns all available JLPT proficiency levels",
    },
  })

  .get("/vocabulary", async ({ query }) => {
    const { level = "N5", limit = "20" } = query;

    const validLevels = ["N5", "N4", "N3", "N2", "N1"];
    const upperLevel = level.toUpperCase();

    if (!validLevels.includes(upperLevel)) {
      return {
        success: false,
        error: "Invalid level. Use N5, N4, N3, N2, or N1",
      };
    }

    try {
      const words = await getVocabularyByLevel(upperLevel, parseInt(limit));

      return {
        success: true,
        level: upperLevel,
        count: words.length,
        words,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch vocabulary",
      };
    }
  }, {
    query: t.Object({
      level: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Japanese Quiz"],
      summary: "Get vocabulary by level",
      description: "Retrieves Japanese vocabulary words for specified JLPT level",
    },
  })

  .get("/quiz", async ({ query }) => {
    const { level = "N5", count = "10" } = query;

    const validLevels = ["N5", "N4", "N3", "N2", "N1"];
    const upperLevel = level.toUpperCase();

    if (!validLevels.includes(upperLevel)) {
      return {
        success: false,
        error: "Invalid level. Use N5, N4, N3, N2, or N1",
      };
    }

    try {
      const quizCount = parseInt(count);
      const words = await getVocabularyByLevel(upperLevel, quizCount * 4);
      const quiz = generateQuiz(words, quizCount);

      return {
        success: true,
        level: upperLevel,
        count: quiz.length,
        questions: quiz,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to generate quiz",
      };
    }
  }, {
    query: t.Object({
      level: t.Optional(t.String()),
      count: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Japanese Quiz"],
      summary: "Generate quiz questions",
      description: "Generates multiple choice quiz questions for Japanese vocabulary",
    },
  })

  .get("/random", async ({ query }) => {
    const { level = "N5" } = query;

    const validLevels = ["N5", "N4", "N3", "N2", "N1"];
    const upperLevel = level.toUpperCase();

    if (!validLevels.includes(upperLevel)) {
      return {
        success: false,
        error: "Invalid level. Use N5, N4, N3, N2, or N1",
      };
    }

    try {
      const words = await getVocabularyByLevel(upperLevel, 1);

      if (words.length === 0) {
        return {
          success: false,
          error: "No vocabulary found for this level",
        };
      }

      return {
        success: true,
        level: upperLevel,
        word: words[0],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch random word",
      };
    }
  }, {
    query: t.Object({
      level: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Japanese Quiz"],
      summary: "Get random word",
      description: "Returns a random Japanese word for specified JLPT level",
    },
  })

  .post("/verify", async ({ body }) => {
    const { questionId, answer, correct } = body;

    const isCorrect = answer === correct;

    return {
      success: true,
      questionId,
      isCorrect,
      message: isCorrect ? "Correct! よくできました！" : "Incorrect. Try again!",
    };
  }, {
    body: t.Object({
      questionId: t.Number(),
      answer: t.String(),
      correct: t.String(),
    }),
    detail: {
      tags: ["Japanese Quiz"],
      summary: "Verify quiz answer",
      description: "Checks if the submitted answer is correct",
    },
  });
