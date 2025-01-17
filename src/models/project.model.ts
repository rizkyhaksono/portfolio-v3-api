import Elysia, { t } from "elysia";

const projectModel = new Elysia().model({
  "project.model": t.Object({
    image: t.String({ format: "uri" }),
    title: t.String(),
    description: t.String(),
    content: t.String(),
    projectLink: t.String(),
    sourceCodeLink: t.Optional(t.String()),
    isFeatured: t.Boolean(),
    created_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date())
  })
})

export default projectModel;