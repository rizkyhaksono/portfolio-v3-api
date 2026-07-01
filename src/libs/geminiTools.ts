import { getSupabaseProjects, getSupabaseCareers, getSupabaseEducations } from "@/libs/supabaseData";

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
  const limit = typeof args.limit === "number" ? args.limit : 12;

  switch (name) {
    case "get_projects": {
      const items = await getSupabaseProjects();
      return JSON.stringify(
        items.slice(0, limit).map((p) => ({
          title: p.title,
          description: p.description,
          link: p.url,
          sourceCode: p.source_code,
        }))
      );
    }
    case "get_work_experience": {
      // Supabase `career.title` is "Company - Role"; `subtitle` is the summary.
      const items = await getSupabaseCareers();
      return JSON.stringify(
        items.map((c) => ({
          role: c.title,
          summary: c.subtitle,
          duration: c.duration,
        }))
      );
    }
    case "get_education": {
      const items = await getSupabaseEducations();
      return JSON.stringify(
        items.map((e) => ({
          school: e.title,
          detail: e.subtitle,
          duration: e.duration,
        }))
      );
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
