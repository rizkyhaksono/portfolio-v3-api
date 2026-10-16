import Elysia, { t } from "elysia";

const aiModel = new Elysia().model({
  "ai.model": t.Object({
    // Needs a non-whitespace char: blank text would spend quota and 503 at Gemini instead of 400.
    text: t.String({ pattern: "\\S" }),
    chatId: t.Optional(t.String()),
  }),
});

export default aiModel