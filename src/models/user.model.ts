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
  "update.user.model": t.Object({
    email: t.Optional(t.String({ format: "email" })),
    emailVerified: t.Optional(t.Boolean()),
    name: t.Optional(t.String()),
    headline: t.Optional(t.String()),
    location: t.Optional(t.String()),
    about: t.Optional(t.String()),
    bannerUrl: t.Optional(t.String()),
  })
});

export default userModel;