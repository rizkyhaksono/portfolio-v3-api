import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface ChessPlayer {
  username: string;
  player_id: number;
  title?: string;
  status: string;
  name?: string;
  avatar?: string;
  location?: string;
  country: string;
  followers: number;
  is_streamer: boolean;
  joined: number;
  last_online: number;
  league?: string;
  url: string;
}

interface ChessRatingCategory {
  last?: { rating: number; date: number };
  best?: { rating: number; date: number; game: string };
  record?: { win: number; loss: number; draw: number };
}

interface ChessStats {
  chess_rapid?: ChessRatingCategory;
  chess_blitz?: ChessRatingCategory;
  chess_bullet?: ChessRatingCategory;
  chess_daily?: ChessRatingCategory;
  tactics?: { highest: { rating: number; date: number }; lowest: { rating: number; date: number } };
  puzzle_rush?: { best?: { total_attempts: number; score: number } };
}

function formatRatingCategory(cat?: ChessRatingCategory) {
  if (!cat) return null;
  return {
    rating: cat.last?.rating ?? null,
    bestRating: cat.best?.rating ?? null,
    record: cat.record
      ? { win: cat.record.win, loss: cat.record.loss, draw: cat.record.draw }
      : null,
  };
}

export default createElysia().get(
  "/chess",
  async ({ query }: { query: { username: string } }) => {
    const username = query.username.toLowerCase().trim();

    try {
      const [playerRes, statsRes] = await Promise.all([
        fetch(`https://api.chess.com/pub/player/${username}`, {
          headers: { "User-Agent": "portfolio-api" },
        }),
        fetch(`https://api.chess.com/pub/player/${username}/stats`, {
          headers: { "User-Agent": "portfolio-api" },
        }),
      ]);

      if (playerRes.status === 404) {
        return {
          status: 404,
          message: `Player "${username}" not found on Chess.com`,
          data: null,
        };
      }

      if (!playerRes.ok) throw new Error(`Chess.com API error: ${playerRes.status}`);

      const player: ChessPlayer = await playerRes.json();
      const stats: ChessStats = statsRes.ok ? await statsRes.json() : {};

      // Extract country code from country URL (e.g. https://api.chess.com/pub/country/US)
      const countryCode = player.country.split("/").pop() ?? null;

      return {
        status: 200,
        message: "Success",
        data: {
          username: player.username,
          name: player.name ?? null,
          title: player.title ?? null,
          avatar: player.avatar ?? null,
          location: player.location ?? null,
          countryCode,
          followers: player.followers,
          status: player.status,
          isStreamer: player.is_streamer,
          league: player.league ?? null,
          profileUrl: player.url,
          joinedAt: new Date(player.joined * 1000).toISOString(),
          lastOnlineAt: new Date(player.last_online * 1000).toISOString(),
          ratings: {
            rapid: formatRatingCategory(stats.chess_rapid),
            blitz: formatRatingCategory(stats.chess_blitz),
            bullet: formatRatingCategory(stats.chess_bullet),
            daily: formatRatingCategory(stats.chess_daily),
          },
          tactics: stats.tactics
            ? {
                highest: stats.tactics.highest.rating,
                lowest: stats.tactics.lowest.rating,
              }
            : null,
          puzzleRush: stats.puzzle_rush?.best
            ? { score: stats.puzzle_rush.best.score, attempts: stats.puzzle_rush.best.total_attempts }
            : null,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        message: error.message ?? "Failed to fetch Chess.com stats",
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
      summary: "Get Chess.com player stats",
      description:
        "Fetch Chess.com player profile and ratings (rapid, blitz, bullet, daily) for a given username. No API key required.",
    },
  },
);
