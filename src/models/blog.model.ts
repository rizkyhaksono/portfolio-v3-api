import Elysia, { t } from "elysia";

const blogModel = new Elysia().model({
  "blog.model": t.Object({
    title: t.String(),
    slug: t.String(),
    description: t.String(),
    content: t.String(),
    coverImage: t.Optional(t.String()),
    published: t.Optional(t.Boolean()),
  }),
  "blog.update.model": t.Object({
    title: t.Optional(t.String()),
    slug: t.Optional(t.String()),
    description: t.Optional(t.String()),
    content: t.Optional(t.String()),
    coverImage: t.Optional(t.String()),
    published: t.Optional(t.Boolean()),
  }),
});

export default blogModel;
