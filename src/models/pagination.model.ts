import Elysia, { t } from "elysia";

const paginationModel = new Elysia().model({
  "pagination.page-based.query.model": t.Object({
    page: t.Optional(t.Number({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 50, default: 10 })),
  }),
})

export default paginationModel;