import Elysia, { t } from "elysia";

const userModel = new Elysia().model({
  "user.model": t.Object({
    email: t.String({ format: "email" }),
    email_verified: t.Optional(t.Boolean()),
    name: t.String(),
    headline: t.Optional(t.String()),
    location: t.Optional(t.String()),
    about: t.Optional(t.String()),
    bannerUrl: t.Optional(t.String({ format: "uri" })),
    icon_url: t.Optional(t.String({ format: "uri" })),
    created_at: t.Optional(t.Date()),
    updated_at: t.Optional(t.Date())
  }),
  // Limits match the web profile form, so public pages never carry multi-megabyte strings.
  "update.user.model": t.Object({
    email: t.Optional(t.String({ format: "email", maxLength: 254 })),
    name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
    headline: t.Optional(t.String({ maxLength: 100 })),
    location: t.Optional(t.String({ maxLength: 100 })),
    about: t.Optional(t.String({ maxLength: 500 })),
    bannerUrl: t.Optional(t.String({ maxLength: 2048 })),
  })
});

export default userModel;