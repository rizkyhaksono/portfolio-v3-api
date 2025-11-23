import Elysia, { t } from "elysia";

export const publicChatModel = new Elysia().model({
  "publicChat.post": t.Object({
    message: t.String({ minLength: 1, maxLength: 1000 }),
    replyToId: t.Optional(t.String()),
  }),
  "publicChat.update": t.Object({
    message: t.String({ minLength: 1, maxLength: 1000 }),
  }),
  "publicChat.user": t.Object({
    id: t.String(),
    name: t.String(),
    avatarUrl: t.Nullable(t.String()),
    headline: t.Nullable(t.String()),
  }),
  "publicChat.replyTo": t.Object({
    id: t.String(),
    message: t.String(),
    userId: t.String(),
    user: t.Ref("publicChat.user"),
    createdAt: t.Date(),
  }),
  "publicChat.response": t.Object({
    id: t.String(),
    message: t.String(),
    userId: t.String(),
    user: t.Ref("publicChat.user"),
    replyToId: t.Nullable(t.String()),
    replyTo: t.Nullable(t.Ref("publicChat.replyTo")),
    replyCount: t.Optional(t.Number()),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  }),
});
