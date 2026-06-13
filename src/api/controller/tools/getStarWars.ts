import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

// Characters come from akabab/starwars-api (static, includes images + rich lore).
// Films & starships come from swapi.info (swapi.dev is frequently down).
const AKABAB = "https://akabab.github.io/starwars-api/api";
const SWAPI = "https://swapi.info/api";
const PAGE_SIZE = 12;

interface AkababChar {
  id: number;
  name: string;
  height?: number;
  mass?: number;
  gender?: string;
  homeworld?: string;
  image?: string;
  born?: number;
  died?: number;
  species?: string;
  hairColor?: string;
  eyeColor?: string;
  skinColor?: string;
  affiliations?: string[];
}

interface SwapiStarship {
  name: string;
  model: string;
  manufacturer: string;
  crew: string;
  passengers: string;
  starship_class: string;
  hyperdrive_rating: string;
  MGLT: string;
  url: string;
}

function extractId(url: string): number {
  return parseInt(url.split("/").filter(Boolean).pop() ?? "0");
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "portfolio-api" } });
  if (!res.ok) throw new Error(`Star Wars API error: ${res.status}`);
  return res.json();
}

interface FandomQuery {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: Record<string, { title?: string; thumbnail?: { source?: string } }>;
  };
}

// Batch-resolve images from starwars.fandom.com for a set of page titles/names.
// Returns a map keyed by the ORIGINAL input name. Missing/unknown → null. Never throws.
async function fetchFandomImages(names: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  const unique = [...new Set(names.filter(Boolean))];
  unique.forEach((n) => (result[n] = null));
  if (unique.length === 0) return result;

  try {
    const titles = encodeURIComponent(unique.join("|"));
    const url = `https://starwars.fandom.com/api.php?action=query&format=json&redirects=1&prop=pageimages&pithumbsize=400&titles=${titles}`;
    const res = await fetch(url, { headers: { "User-Agent": "portfolio-api" } });
    if (!res.ok) return result;
    const data = (await res.json()) as FandomQuery;
    const q = data.query;
    if (!q) return result;

    const normMap: Record<string, string> = {};
    (q.normalized ?? []).forEach((x) => (normMap[x.from] = x.to));
    const redirMap: Record<string, string> = {};
    (q.redirects ?? []).forEach((x) => (redirMap[x.from] = x.to));
    const titleImg: Record<string, string> = {};
    Object.values(q.pages ?? {}).forEach((p) => {
      if (p?.title && p?.thumbnail?.source) titleImg[p.title] = p.thumbnail.source;
    });

    for (const name of unique) {
      let t = normMap[name] ?? name;
      for (let i = 0; i < 3 && redirMap[t]; i++) t = redirMap[t];
      result[name] = titleImg[t] ?? null;
    }
    return result;
  } catch {
    return result;
  }
}

function paginate<T>(all: T[], page: number) {
  const total = all.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { slice, page, total, totalPages, prev: page > 1 ? page - 1 : null, next: page < totalPages ? page + 1 : null };
}

function bornToYear(born?: number): string {
  if (born === undefined || born === null) return "unknown";
  return born < 0 ? `${Math.abs(born)} BBY` : `${born} ABY`;
}

function mapPerson(c: AkababChar) {
  return {
    id: c.id,
    name: c.name,
    image: c.image ?? null,
    gender: c.gender ?? "unknown",
    species: c.species ?? "unknown",
    homeworld: c.homeworld ?? "unknown",
    height: typeof c.height === "number" ? `${c.height} m` : "unknown",
    mass: typeof c.mass === "number" ? `${c.mass} kg` : "unknown",
    birthYear: bornToYear(c.born),
    eyeColor: c.eyeColor ?? "unknown",
    hairColor: c.hairColor ?? "unknown",
    affiliations: c.affiliations ?? [],
  };
}

export default createElysia()
  .get(
    "/starwars/people",
    async ({ query }: { query: { page?: string } }) => {
      const page = Math.max(parseInt(query.page ?? "1"), 1);
      const all = await getJson<AkababChar[]>(`${AKABAB}/all.json`);
      const { slice, ...meta } = paginate(all, page);
      return { status: 200, message: "Success", data: slice.map(mapPerson), ...meta };
    },
    {
      query: t.Object({ page: t.Optional(t.String()) }),
      detail: { tags: ["Star Wars"], summary: "Get Star Wars characters (with images, paginated)" },
    },
  )
  .get(
    "/starwars/people/:id",
    async ({ params }: { params: { id: string } }) => {
      try {
        const c = await getJson<AkababChar>(`${AKABAB}/id/${params.id}.json`);
        return { status: 200, message: "Success", data: mapPerson(c) };
      } catch {
        return { status: 404, message: "Character not found", data: null };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["Star Wars"], summary: "Get Star Wars character by ID" },
    },
  )
  .get(
    "/starwars/starships",
    async ({ query }: { query: { page?: string } }) => {
      const page = Math.max(parseInt(query.page ?? "1"), 1);
      const all = await getJson<SwapiStarship[]>(`${SWAPI}/starships`);
      const { slice, ...meta } = paginate(all, page);
      const images = await fetchFandomImages(slice.map((s) => s.name));
      return {
        status: 200,
        message: "Success",
        data: slice.map((s) => ({
          id: extractId(s.url),
          name: s.name,
          image: images[s.name] ?? null,
          model: s.model,
          manufacturer: s.manufacturer,
          starshipClass: s.starship_class,
          crew: s.crew,
          passengers: s.passengers,
          hyperdriveRating: s.hyperdrive_rating,
          mglt: s.MGLT,
        })),
        ...meta,
      };
    },
    {
      query: t.Object({ page: t.Optional(t.String()) }),
      detail: { tags: ["Star Wars"], summary: "Get Star Wars starships (paginated)" },
    },
  );
