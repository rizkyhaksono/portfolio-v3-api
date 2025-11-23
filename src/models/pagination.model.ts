import Elysia, { t } from "elysia";

const paginationModel = new Elysia().model({
  "pagination.query.model": t.Object({
    cursor: t.Optional(t.String()),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 50, default: 10 })),
  }),
})

export default paginationModel;