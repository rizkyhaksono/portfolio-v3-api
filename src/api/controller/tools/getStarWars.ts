import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

const SWAPI = "https://swapi.dev/api";

interface SwapiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface SwapiPerson {
  name: string;
  height: string;
  mass: string;
  hair_color: string;
  skin_color: string;
  eye_color: string;
  birth_year: string;
  gender: string;
  homeworld: string;
  films: string[];
  species: string[];
  vehicles: string[];
  starships: string[];
  url: string;
}

interface SwapiFilm {
  title: string;
  episode_id: number;
  opening_crawl: string;
  director: string;
  producer: string;
  release_date: string;
  characters: string[];
  planets: string[];
  starships: string[];
  species: string[];
  url: string;
}

interface SwapiStarship {
  name: string;
  model: string;
  manufacturer: string;
  cost_in_credits: string;
  length: string;
  max_atmosphering_speed: string;
  crew: string;
  passengers: string;
  cargo_capacity: string;
  starship_class: string;
  hyperdrive_rating: string;
  MGLT: string;
  url: string;
}

function extractId(url: string): number {
  return parseInt(url.split("/").filter(Boolean).pop() ?? "0");
}

export default createElysia()
  .get(
    "/starwars/people",
    async ({ query }: { query: { page?: string } }) => {
      const page = Math.max(parseInt(query.page ?? "1"), 1);

      const res = await fetch(`${SWAPI}/people/?page=${page}`, {
        headers: { "User-Agent": "portfolio-api" },
      });

      if (!res.ok) throw new Error(`SWAPI error: ${res.status}`);

      const json: SwapiListResponse<SwapiPerson> = await res.json();
      const totalPages = Math.ceil(json.count / 10);

      return {
        status: 200,
        message: "Success",
        data: json.results.map((p) => ({
          id: extractId(p.url),
          name: p.name,
          height: p.height,
          mass: p.mass,
          hairColor: p.hair_color,
          skinColor: p.skin_color,
          eyeColor: p.eye_color,
          birthYear: p.birth_year,
          gender: p.gender,
          filmsCount: p.films.length,
          starshipsCount: p.starships.length,
        })),
        page,
        total: json.count,
        totalPages,
        prev: json.previous ? page - 1 : null,
        next: json.next ? page + 1 : null,
      };
    },
    {
      query: t.Object({ page: t.Optional(t.String()) }),
      detail: {
        tags: ["Star Wars"],
        summary: "Get Star Wars characters (paginated)",
        description:
          "Fetch Star Wars characters from SWAPI. 10 characters per page.",
      },
    },
  )
  .get(
    "/starwars/people/:id",
    async ({ params }: { params: { id: string } }) => {
      const res = await fetch(`${SWAPI}/people/${params.id}/`, {
        headers: { "User-Agent": "portfolio-api" },
      });

      if (res.status === 404) {
        return { status: 404, message: "Character not found", data: null };
      }
      if (!res.ok) throw new Error(`SWAPI error: ${res.status}`);

      const p: SwapiPerson = await res.json();

      return {
        status: 200,
        message: "Success",
        data: {
          id: extractId(p.url),
          name: p.name,
          height: p.height,
          mass: p.mass,
          hairColor: p.hair_color,
          skinColor: p.skin_color,
          eyeColor: p.eye_color,
          birthYear: p.birth_year,
          gender: p.gender,
          filmIds: p.films.map(extractId),
          starshipIds: p.starships.map(extractId),
          vehicleIds: p.vehicles.map(extractId),
          speciesIds: p.species.map(extractId),
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Star Wars"],
        summary: "Get Star Wars character by ID",
        description: "Fetch detailed info about a Star Wars character by their SWAPI ID.",
      },
    },
  )
  .get(
    "/starwars/films",
    async () => {
      const res = await fetch(`${SWAPI}/films/`, {
        headers: { "User-Agent": "portfolio-api" },
      });

      if (!res.ok) throw new Error(`SWAPI error: ${res.status}`);

      const json: SwapiListResponse<SwapiFilm> = await res.json();

      return {
        status: 200,
        message: "Success",
        data: json.results
          .sort((a, b) => a.episode_id - b.episode_id)
          .map((f) => ({
            id: extractId(f.url),
            episodeId: f.episode_id,
            title: f.title,
            director: f.director,
            producer: f.producer,
            releaseDate: f.release_date,
            openingCrawl: f.opening_crawl.slice(0, 300),
            charactersCount: f.characters.length,
            planetsCount: f.planets.length,
          })),
      };
    },
    {
      detail: {
        tags: ["Star Wars"],
        summary: "Get all Star Wars films",
        description: "Fetch all Star Wars films from SWAPI, sorted by episode number.",
      },
    },
  )
  .get(
    "/starwars/starships",
    async ({ query }: { query: { page?: string } }) => {
      const page = Math.max(parseInt(query.page ?? "1"), 1);

      const res = await fetch(`${SWAPI}/starships/?page=${page}`, {
        headers: { "User-Agent": "portfolio-api" },
      });

      if (!res.ok) throw new Error(`SWAPI error: ${res.status}`);

      const json: SwapiListResponse<SwapiStarship> = await res.json();
      const totalPages = Math.ceil(json.count / 10);

      return {
        status: 200,
        message: "Success",
        data: json.results.map((s) => ({
          id: extractId(s.url),
          name: s.name,
          model: s.model,
          manufacturer: s.manufacturer,
          starshipClass: s.starship_class,
          crew: s.crew,
          passengers: s.passengers,
          hyperdriveRating: s.hyperdrive_rating,
          mglt: s.MGLT,
        })),
        page,
        total: json.count,
        totalPages,
        prev: json.previous ? page - 1 : null,
        next: json.next ? page + 1 : null,
      };
    },
    {
      query: t.Object({ page: t.Optional(t.String()) }),
      detail: {
        tags: ["Star Wars"],
        summary: "Get Star Wars starships (paginated)",
        description: "Fetch Star Wars starships from SWAPI with key specs.",
      },
    },
  );
