import { createElysia } from "@/libs/elysia";
import {
  PaginationQuery,
  paginationQuerySchema,
  parseCursorToNumber,
} from "@/utils/pagination";
import logger from "@/libs/lokiLogger";
import pokemonModel from "@/models/pokemon.model";
import paginationModel from "@/models/pagination.model";
import { Pokemon } from "@/types/pokemon";

export default createElysia()
  .use(pokemonModel)
  .use(paginationModel)
  .get("/pokemon", async ({ query }: { query: PaginationQuery }) => {
    const { cursor, limit } = paginationQuerySchema.parse(query);
    const offset = parseCursorToNumber(cursor) || 0;

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit + 1}`
      );

      if (!response.ok) throw new Error("Failed to fetch Pokemon data");

      const data = await response.json();
      const pokemonList: Pokemon[] = data.results;

      const detailedPokemon = await Promise.all(
        pokemonList.slice(0, limit).map(async (pokemon: Pokemon) => {
          try {
            const detailResponse = await fetch(pokemon.url);
            const detail = await detailResponse.json();

            return {
              id: detail.id,
              name: detail.name,
              sprites: detail.sprites,
              types: detail.types,
              height: detail.height,
              weight: detail.weight,
            };
          } catch (error) {
            logger.error({
              message: "Failed to fetch Pokemon detail",
              pokemon: pokemon.name,
              error: error instanceof Error ? error.message : "Unknown error",
            });

            return {
              id: offset + pokemonList.indexOf(pokemon) + 1,
              name: pokemon.name,
              url: pokemon.url,
            };
          }
        })
      );

      const hasMore = pokemonList.length > limit;
      const nextOffset = hasMore ? offset + limit : null;

      return {
        status: 200,
        message: "Success",
        data: detailedPokemon,
        nextCursor: nextOffset ? Buffer.from(String(nextOffset)).toString("base64") : null,
        hasMore,
        total: data.count,
      };
    } catch (error) {
      logger.error({
        message: "Failed to fetch Pokemon list",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
    {
      query: "pagination.query.model",
      response: "pokemon.response.model",
      detail: {
        tags: ["Pokemon"],
        summary: "Get paginated Pokemon list",
        description: "Retrieve a paginated list of Pokemon from PokeAPI with detailed information",
      },
    }
  )
  .use(pokemonModel)
  .get("/pokemon/:id", async ({
    params: { id }
  }: {
    params: { id: string | number };
  }) => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);

    if (!response.ok) throw new Error("Pokemon not found");

    const data = await response.json();

    return {
      status: 200,
      message: "Success",
      data,
    };
  },
    {
      params: "pokemon.param.model",
      detail: {
        tags: ["Pokemon"],
        summary: "Get Pokemon by ID or name",
        description: "Get detailed information about a specific Pokemon",
      },
    }
  );
