import Elysia, { t } from "elysia";

const workModel = new Elysia().model({
  "work.model": t.Object({
    logo: t.String({ format: "uri" }),
    jobTitle: t.String(),
    content: t.String(),
    instance: t.String(),
    instanceLink: t.String(),
    address: t.String(),
    duration: t.String(),
    created_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date())
  }),
  "work.model.response": t.Object({
    id: t.Number(),
    logo: t.String({ format: "uri" }),
    jobTitle: t.String(),
    content: t.String(),
    instance: t.String(),
    instanceLink: t.String(),
    address: t.String(),
    duration: t.String(),
    created_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date())
  })
})

export default workModel;