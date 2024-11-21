import Elysia, { t } from "elysia";

const aiModel = new Elysia().model({
  "ai.model": t.Object({
    text: t.String()
  })
})

export default aiModel