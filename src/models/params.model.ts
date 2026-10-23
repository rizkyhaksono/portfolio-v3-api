import { t } from "elysia";

/** `/:id` path params (cuid or Lucia ids). */
export const idParams = t.Object({ id: t.String({ minLength: 1, maxLength: 64 }) });

export const slugParams = t.Object({ slug: t.String({ minLength: 1, maxLength: 200 }) });
