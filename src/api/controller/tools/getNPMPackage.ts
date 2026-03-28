import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface NPMAuthor {
  name: string;
  email?: string;
  url?: string;
}

interface NPMRegistryResponse {
  name: string;
  description?: string;
  license?: string;
  homepage?: string;
  keywords?: string[];
  author?: NPMAuthor | string;
  repository?: { type: string; url: string } | string;
  "dist-tags": Record<string, string>;
  versions: Record<string, unknown>;
  time: Record<string, string>;
}

interface NPMDownloadsResponse {
  downloads: number;
  package: string;
}

function resolveAuthor(author: NPMRegistryResponse["author"]): string | null {
  if (!author) return null;
  return typeof author === "string" ? author : author.name;
}

function resolveRepository(
  repo: NPMRegistryResponse["repository"],
): string | null {
  if (!repo) return null;
  if (typeof repo === "string") return repo;
  return repo.url.replace(/^git\+/, "").replace(/\.git$/, "");
}

export default createElysia().get(
  "/npm",
  async ({ query }: { query: { name: string } }) => {
    const packageName = query.name;
    // Preserve scoped package slash (e.g. @org/pkg) without double-encoding
    const encodedName = encodeURIComponent(packageName).replace(/%2F/g, "/");

    try {
      const [registryRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`https://registry.npmjs.org/${encodedName}`),
        fetch(`https://api.npmjs.org/downloads/point/last-week/${encodedName}`),
        fetch(`https://api.npmjs.org/downloads/point/last-month/${encodedName}`),
      ]);

      if (registryRes.status === 404) {
        return {
          status: 404,
          message: `Package "${packageName}" not found on NPM`,
          data: null,
        };
      }

      if (!registryRes.ok) {
        throw new Error(`NPM registry error: ${registryRes.status}`);
      }

      const registry: NPMRegistryResponse = await registryRes.json();
      const weekly: NPMDownloadsResponse | null = weeklyRes.ok
        ? await weeklyRes.json()
        : null;
      const monthly: NPMDownloadsResponse | null = monthlyRes.ok
        ? await monthlyRes.json()
        : null;

      const latestVersion = registry["dist-tags"].latest;

      return {
        status: 200,
        message: "Success",
        data: {
          name: registry.name,
          description: registry.description ?? null,
          version: latestVersion,
          license: registry.license ?? null,
          author: resolveAuthor(registry.author),
          homepage: registry.homepage ?? null,
          repository: resolveRepository(registry.repository),
          keywords: registry.keywords ?? [],
          totalVersions: Object.keys(registry.versions).length,
          distTags: registry["dist-tags"],
          downloads: {
            weekly: weekly?.downloads ?? null,
            monthly: monthly?.downloads ?? null,
          },
          publishedAt: registry.time[latestVersion] ?? null,
          createdAt: registry.time["created"] ?? null,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        message: error.message ?? "Failed to fetch NPM package info",
        data: null,
      };
    }
  },
  {
    query: t.Object({
      name: t.String({
        minLength: 1,
        description: "Package name, e.g. elysia or @elysiajs/cors",
      }),
    }),
    detail: {
      tags: ["Tools"],
      summary: "Get NPM package stats",
      description:
        "Fetch package metadata and download statistics (weekly & monthly) from the NPM registry. Supports scoped packages like @org/package.",
    },
  },
);
