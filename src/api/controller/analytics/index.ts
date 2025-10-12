import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface PageView {
  path: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  referer?: string;
}

// In-memory storage (for demo - use database in production)
const pageViews: Map<string, PageView[]> = new Map();

export default createElysia()
  .get("/", async () => {
    return {
      message: "Analytics & Performance Metrics API",
      endpoints: {
        track: "POST /track - Track page view",
        stats: "GET /stats - Get analytics statistics",
        pageViews: "GET /page-views?path=/page - Get page view count",
        topPages: "GET /top-pages?limit=10 - Get most visited pages",
      },
      recommendations: {
        selfHosted: [
          "Umami - Simple, privacy-focused analytics (https://umami.is)",
          "Plausible Analytics - Lightweight, privacy-friendly (https://plausible.io)",
          "Matomo - Full-featured, GDPR compliant (https://matomo.org)",
          "GoatCounter - Simple web statistics (https://www.goatcounter.com)",
          "Ackee - Self-hosted analytics tool (https://ackee.electerious.com)",
        ],
        cloudBased: [
          "Vercel Analytics - Integrated with Vercel deployments",
          "Cloudflare Web Analytics - Privacy-first, free tier available",
          "Fathom Analytics - Simple, privacy-focused (paid)",
        ],
        openSource: {
          umami: {
            name: "Umami",
            description: "Simple, fast, privacy-focused analytics",
            features: ["No cookies", "GDPR compliant", "Self-hosted", "Real-time data"],
            installation: "npm install umami or docker run",
          },
          plausible: {
            name: "Plausible",
            description: "Lightweight and open-source website analytics",
            features: ["< 1KB script", "No cookies", "EU servers", "Open source"],
            installation: "Docker compose or managed hosting",
          },
        },
      },
      note: "For production, integrate with external analytics services or use a database to persist data",
    };
  }, {
    detail: {
      tags: ["Analytics"],
      summary: "Analytics API Information",
    },
  })

  .post("/track", async ({ body, headers }) => {
    const { path } = body;
    const userAgent = headers["user-agent"];
    const ip = headers["x-forwarded-for"] || headers["x-real-ip"];
    const referer = headers["referer"];

    const pageView: PageView = {
      path,
      timestamp: new Date(),
      userAgent,
      ip,
      referer,
    };

    if (!pageViews.has(path)) {
      pageViews.set(path, []);
    }
    pageViews.get(path)?.push(pageView);

    return {
      success: true,
      message: "Page view tracked",
      data: {
        path,
        timestamp: pageView.timestamp,
      },
    };
  }, {
    body: t.Object({
      path: t.String(),
      metadata: t.Optional(t.Object({
        title: t.Optional(t.String()),
        referrer: t.Optional(t.String()),
      })),
    }),
    detail: {
      tags: ["Analytics"],
      summary: "Track page view",
      description: "Records a page view event with metadata",
    },
  })

  .get("/stats", async () => {
    const totalViews = Array.from(pageViews.values()).reduce(
      (sum, views) => sum + views.length,
      0
    );

    const uniquePaths = pageViews.size;

    const pathStats = Array.from(pageViews.entries()).map(([path, views]) => ({
      path,
      views: views.length,
      lastViewed: views[views.length - 1]?.timestamp,
    }));

    const sortedPaths = pathStats.toSorted((a, b) => b.views - a.views);

    return {
      success: true,
      data: {
        totalViews,
        uniquePaths,
        paths: sortedPaths,
      },
    };
  }, {
    detail: {
      tags: ["Analytics"],
      summary: "Get analytics statistics",
      description: "Returns overall analytics statistics",
    },
  })

  .get("/page-views", async ({ query }) => {
    const { path } = query;

    if (!path) {
      return {
        success: false,
        error: "Path parameter is required",
      };
    }

    const views = pageViews.get(path) || [];

    return {
      success: true,
      data: {
        path,
        totalViews: views.length,
        views: views.map(v => ({
          timestamp: v.timestamp,
          referer: v.referer,
        })),
      },
    };
  }, {
    query: t.Object({
      path: t.String(),
    }),
    detail: {
      tags: ["Analytics"],
      summary: "Get page view count",
      description: "Returns view count and details for a specific page",
    },
  })

  .get("/top-pages", async ({ query }) => {
    const { limit = "10" } = query;

    const pathStats = Array.from(pageViews.entries())
      .map(([path, views]) => ({
        path,
        views: views.length,
        lastViewed: views[views.length - 1]?.timestamp,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, parseInt(limit));

    return {
      success: true,
      data: {
        topPages: pathStats,
        total: pathStats.length,
      },
    };
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Analytics"],
      summary: "Get most visited pages",
      description: "Returns the most visited pages ordered by view count",
    },
  })

  .get("/realtime", async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const recentViews = Array.from(pageViews.entries())
      .flatMap(([pagePath, views]) =>
        views
          .filter(v => v.timestamp >= fiveMinutesAgo)
          .map(v => ({ ...v, path: pagePath }))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      success: true,
      data: {
        activeViewers: recentViews.length,
        recentViews: recentViews.slice(0, 20),
      },
    };
  }, {
    detail: {
      tags: ["Analytics"],
      summary: "Get real-time analytics",
      description: "Returns recent page views in the last 5 minutes",
    },
  })

  .delete("/reset", async () => {
    pageViews.clear();

    return {
      success: true,
      message: "Analytics data reset successfully",
    };
  }, {
    detail: {
      tags: ["Analytics"],
      summary: "Reset analytics data",
      description: "Clears all analytics data (development only)",
    },
  });
