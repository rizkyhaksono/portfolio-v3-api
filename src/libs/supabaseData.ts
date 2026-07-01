/**
 * Reads the portfolio's real content from Supabase (where projects/career/education
 * actually live), so the AI tools + RAG answer from real data instead of the empty
 * backend Prisma tables. Requires SUPABASE_URL + SUPABASE_ANON_KEY (or service role).
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export interface SbProject {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  source_code: string | null;
}
export interface SbCareer {
  id: string;
  title: string;
  subtitle: string | null;
  duration: string | null;
}
export interface SbEducation {
  id: string;
  title: string;
  subtitle: string | null;
  duration: string | null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function select<T>(table: string, query: string): Promise<T[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

export function getSupabaseProjects(): Promise<SbProject[]> {
  return select<SbProject>("projects", "select=*&order=created_at.desc");
}
export function getSupabaseCareers(): Promise<SbCareer[]> {
  return select<SbCareer>("career", "select=*&order=created_at.asc");
}
export function getSupabaseEducations(): Promise<SbEducation[]> {
  return select<SbEducation>("education", "select=*&order=created_at.asc");
}
