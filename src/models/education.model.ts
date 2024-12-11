import Elysia, { t } from "elysia";

const educationModel = new Elysia().model({
  "education.model": t.Object({
    logo: t.String({ format: "uri" }),
    instance: t.String(),
    content: t.String(),
    address: t.String(),
    duration: t.String(),
    created_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date())
  })
})

export default educationModel;