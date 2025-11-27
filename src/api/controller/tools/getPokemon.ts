import { createElysia } from "@/libs/elysia";
import {
  PageBasedPaginationQuery,
  pageBasedPaginationQuerySchema,
} from "@/utils/pagination";
import logger from "@/libs/lokiLogger";
import pokemonModel from "@/models/pokemon.model";
import paginationModel from "@/models/pagination.model";
import { Pokemon } from "@/types/pokemon";

export default createElysia()
  .use(pokemonModel)
  .use(paginationModel)
  .get("/pokemon", async ({ query }: { query: PageBasedPaginationQuery }) => {
    const { page, limit } = pageBasedPaginationQuerySchema.parse(query);
    const offset = (page - 1) * limit;

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`
      );

      if (!response.ok) throw new Error("Failed to fetch Pokemon data");

      const data = await response.json();
      const pokemonList: Pokemon[] = data.results;

      const detailedPokemon = await Promise.all(
        pokemonList.map(async (pokemon: Pokemon) => {
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

      const total = data.count;
      const totalPages = Math.ceil(total / limit);
      const prev = page > 1 ? page - 1 : null;
      const next = page < totalPages ? page + 1 : null;

      return {
        status: 200,
        message: "Success",
        data: detailedPokemon,
        page,
        limit,
        total,
        totalPages,
        prev,
        next,
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
      query: "pagination.page-based.query.model",
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
