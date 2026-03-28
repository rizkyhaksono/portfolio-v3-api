import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import {
  PageBasedPaginationQuery,
  pageBasedPaginationQuerySchema,
} from "@/utils/pagination";
import paginationModel from "@/models/pagination.model";

interface PokemonStat {
  base_stat: number;
  stat: { name: string };
}

interface PokemonAbility {
  ability: { name: string };
  is_hidden: boolean;
}

interface PokemonType {
  type: { name: string };
}

interface PokemonRaw {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string;
    front_shiny: string;
    other: { "official-artwork": { front_default: string } };
  };
  types: PokemonType[];
  abilities: PokemonAbility[];
  stats: PokemonStat[];
}

function formatCard(p: PokemonRaw) {
  return {
    id: p.id,
    name: p.name,
    image: p.sprites.other["official-artwork"].front_default ?? p.sprites.front_default,
    types: p.types.map((t) => t.type.name),
    height: p.height,
    weight: p.weight,
  };
}

function formatDetail(p: PokemonRaw) {
  const statMap: Record<string, string> = {
    hp: "hp",
    attack: "attack",
    defense: "defense",
    "special-attack": "specialAttack",
    "special-defense": "specialDefense",
    speed: "speed",
  };

  const stats = p.stats.reduce(
    (acc, s) => {
      const key = statMap[s.stat.name];
      if (key) acc[key] = s.base_stat;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    ...formatCard(p),
    sprites: {
      front: p.sprites.front_default,
      shiny: p.sprites.front_shiny,
      artwork: p.sprites.other["official-artwork"].front_default,
    },
    abilities: p.abilities.map((a) => ({
      name: a.ability.name,
      isHidden: a.is_hidden,
    })),
    stats,
    baseExperience: p.base_experience,
  };
}

export default createElysia()
  .use(paginationModel)
  .get(
    "/pokemon",
    async ({ query }: { query: PageBasedPaginationQuery }) => {
      const { page, limit } = pageBasedPaginationQuerySchema.parse(query);
      const offset = (page - 1) * limit;

      const listRes = await fetch(
        `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`,
      );
      if (!listRes.ok) throw new Error("Failed to fetch Pokemon list");

      const listData = await listRes.json();
      const total: number = listData.count;
      const totalPages = Math.ceil(total / limit);

      const cards = await Promise.all(
        listData.results.map(async (p: { name: string; url: string }) => {
          try {
            const res = await fetch(p.url);
            if (!res.ok) throw new Error();
            const data: PokemonRaw = await res.json();
            return formatCard(data);
          } catch {
            // fallback: extract id from URL
            const id = parseInt(p.url.split("/").filter(Boolean).pop() ?? "0");
            return { id, name: p.name, image: null, types: [], height: 0, weight: 0 };
          }
        }),
      );

      return {
        status: 200,
        message: "Success",
        data: cards,
        page,
        limit,
        total,
        totalPages,
        prev: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      };
    },
    {
      query: "pagination.page-based.query.model",
      detail: {
        tags: ["Pokemon"],
        summary: "Get paginated Pokemon card list",
        description:
          "Returns a paginated list of Pokemon in card format: id, name, official artwork, types, height, weight.",
      },
    },
  )
  .get(
    "/pokemon/search",
    async ({ query }: { query: { name: string } }) => {
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${query.name.toLowerCase().trim()}`,
      );

      if (res.status === 404) {
        return { status: 404, message: `Pokemon "${query.name}" not found`, data: null };
      }
      if (!res.ok) throw new Error("PokeAPI error");

      const data: PokemonRaw = await res.json();
      return { status: 200, message: "Success", data: formatCard(data) };
    },
    {
      query: t.Object({ name: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["Pokemon"],
        summary: "Search Pokemon by name",
        description: "Search for a Pokemon by name and get its card data.",
      },
    },
  )
  .get(
    "/pokemon/:id",
    async ({ params }: { params: { id: string } }) => {
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${params.id}`,
      );

      if (res.status === 404) {
        return { status: 404, message: `Pokemon "${params.id}" not found`, data: null };
      }
      if (!res.ok) throw new Error("PokeAPI error");

      const data: PokemonRaw = await res.json();
      return { status: 200, message: "Success", data: formatDetail(data) };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Pokemon"],
        summary: "Get Pokemon detail by ID or name",
        description:
          "Returns full Pokemon card detail: types, stats (HP/ATK/DEF/SpATK/SpDEF/SPD), abilities, sprites, and base experience.",
      },
    },
  );
