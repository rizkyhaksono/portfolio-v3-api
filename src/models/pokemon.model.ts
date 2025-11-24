import Elysia, { t } from "elysia";

const pokemonModel = new Elysia().model({
  "pokemon.param.model": t.Object({
    id: t.Number(),
  }),
  "pokemon.response.model": t.Object({
    200: t.Object({
      status: t.Number(),
      message: t.String(),
      data: t.Array(
        t.Object({
          id: t.Number(),
          name: t.String(),
          sprites: t.Optional(
            t.Object({
              front_default: t.String(),
              front_shiny: t.String(),
              other: t.Object({
                "official-artwork": t.Object({
                  front_default: t.String(),
                }),
              }),
            })
          ),
          types: t.Optional(
            t.Array(
              t.Object({
                type: t.Object({
                  name: t.String(),
                }),
              })
            )
          ),
          height: t.Optional(t.Number()),
          weight: t.Optional(t.Number()),
          url: t.Optional(t.String()),
        })
      ),
      nextCursor: t.Nullable(t.String()),
      hasMore: t.Boolean(),
      total: t.Optional(t.Number()),
    }),
  }),
})

export default pokemonModel;