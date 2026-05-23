import { prismaClient } from "@/libs/prismaDatabase";

export const portfolioToolDeclarations = [
  {
    name: "get_projects",
    description: "List portfolio projects with title and description",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 5)" },
      },
    },
  },
  {
    name: "get_work_experience",
    description: "List work experience entries",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 5)" },
      },
    },
  },
  {
    name: "get_education",
    description: "List education entries",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 5)" },
      },
    },
  },
] as const;

export async function executePortfolioTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const limit = typeof args.limit === "number" ? args.limit : 5;

  switch (name) {
    case "get_projects": {
      const items = await prismaClient.project.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
      });
      return JSON.stringify(
        items.map((p) => ({
          title: p.title,
          description: p.description,
          link: p.projectLink,
          featured: p.isFeatured,
        }))
      );
    }
    case "get_work_experience": {
      const items = await prismaClient.work.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
      });
      return JSON.stringify(
        items.map((w) => ({
          jobTitle: w.jobTitle,
          company: w.instance,
          duration: w.duration,
          content: w.content,
        }))
      );
    }
    case "get_education": {
      const items = await prismaClient.education.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
      });
      return JSON.stringify(
        items.map((e) => ({
          school: e.instance,
          content: e.content,
          duration: e.duration,
        }))
      );
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
