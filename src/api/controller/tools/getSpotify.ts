import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) throw new Error("Failed to get Spotify access token");

  const data: SpotifyToken = await response.json();
  return data.access_token;
}

async function getCurrentlyPlaying(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to get currently playing track");
  return await response.json();
}

async function getRecentlyPlayed(accessToken: string, limit: number = 10) {
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to get recently played tracks");
  return await response.json();
}

async function getTopTracks(accessToken: string, timeRange: string = "medium_term", limit: number = 10) {
  const response = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to get top tracks");
  return await response.json();
}

export default createElysia()
  .get("/", async () => {
    return {
      message: "Spotify API",
      endpoints: {
        nowPlaying: "GET /now-playing?token=USER_ACCESS_TOKEN - Get currently playing track",
        recentlyPlayed: "GET /recently-played?token=USER_ACCESS_TOKEN&limit=10 - Get recently played tracks",
        topTracks: "GET /top-tracks?token=USER_ACCESS_TOKEN&time_range=medium_term&limit=10 - Get top tracks",
        search: "GET /search?q=query&type=track,artist,album - Search Spotify catalog",
      },
      note: "You need to provide a user access token for personalized endpoints. Use Spotify OAuth2 flow to get one.",
      oauth: {
        authorizeUrl: "https://accounts.spotify.com/authorize",
        scopes: ["user-read-currently-playing", "user-read-recently-played", "user-top-read"],
      },
    };
  }, {
    detail: {
      tags: ["Spotify"],
      summary: "Spotify API Information",
    },
  })

  .get("/now-playing", async ({ query }) => {
    const { token } = query;

    if (!token) {
      return {
        success: false,
        error: "Access token is required",
        help: "Get your token from Spotify OAuth2 flow",
      };
    }

    try {
      const data = await getCurrentlyPlaying(token);

      if (!data?.item) {
        return {
          success: true,
          is_playing: false,
          message: "Nothing is currently playing",
        };
      }

      return {
        success: true,
        is_playing: data.is_playing,
        track: {
          name: data.item.name,
          artists: data.item.artists.map((artist: any) => artist.name),
          album: data.item.album.name,
          album_art: data.item.album.images[0]?.url,
          duration_ms: data.item.duration_ms,
          progress_ms: data.progress_ms,
          spotify_url: data.item.external_urls.spotify,
        },
        context: data.context,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get currently playing track",
      };
    }
  }, {
    query: t.Object({
      token: t.String(),
    }),
    detail: {
      tags: ["Spotify"],
      summary: "Get currently playing track",
      description: "Returns the track currently being played by the user",
    },
  })

  .get("/recently-played", async ({ query }) => {
    const { token, limit = "10" } = query;

    if (!token) {
      return {
        success: false,
        error: "Access token is required",
      };
    }

    try {
      const data = await getRecentlyPlayed(token, parseInt(limit));

      return {
        success: true,
        items: data.items.map((item: any) => ({
          played_at: item.played_at,
          track: {
            name: item.track.name,
            artists: item.track.artists.map((artist: any) => artist.name),
            album: item.track.album.name,
            album_art: item.track.album.images[0]?.url,
            duration_ms: item.track.duration_ms,
            spotify_url: item.track.external_urls.spotify,
          },
        })),
        total: data.items.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get recently played tracks",
      };
    }
  }, {
    query: t.Object({
      token: t.String(),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Spotify"],
      summary: "Get recently played tracks",
      description: "Returns tracks recently played by the user",
    },
  })

  .get("/top-tracks", async ({ query }) => {
    const { token, time_range = "medium_term", limit = "10" } = query;

    if (!token) {
      return {
        success: false,
        error: "Access token is required",
      };
    }

    try {
      const data = await getTopTracks(token, time_range, parseInt(limit));

      return {
        success: true,
        time_range,
        items: data.items.map((track: any) => ({
          name: track.name,
          artists: track.artists.map((artist: any) => artist.name),
          album: track.album.name,
          album_art: track.album.images[0]?.url,
          popularity: track.popularity,
          duration_ms: track.duration_ms,
          spotify_url: track.external_urls.spotify,
        })),
        total: data.items.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get top tracks",
      };
    }
  }, {
    query: t.Object({
      token: t.String(),
      time_range: t.Optional(t.Union([
        t.Literal("short_term"),
        t.Literal("medium_term"),
        t.Literal("long_term"),
      ])),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Spotify"],
      summary: "Get user's top tracks",
      description: "Returns user's top tracks based on time range (short_term: 4 weeks, medium_term: 6 months, long_term: all time)",
    },
  })

  .get("/search", async ({ query }) => {
    const { q, type = "track", limit = "10" } = query;

    if (!q) {
      return {
        success: false,
        error: "Search query is required",
      };
    }

    try {
      const token = await getSpotifyToken();
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search Spotify");

      const data = await response.json();

      return {
        success: true,
        query: q,
        results: data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to search Spotify",
      };
    }
  }, {
    query: t.Object({
      q: t.String(),
      type: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Spotify"],
      summary: "Search Spotify catalog",
      description: "Search for tracks, artists, albums, or playlists",
    },
  });
