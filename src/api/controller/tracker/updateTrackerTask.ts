import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";
import { getTask, updateTask } from "@/libs/trackerStore";
import { t } from "elysia";

const COLUMNS = ["todo", "in_progress", "in_qa", "done"];

/** Auth: only the card's creator (or an admin) can move/edit it. */
export default createElysia()
  .use(authGuard)
  .patch(
    "/:id",
    async ({
      params: { id },
      body,
      user,
      set,
    }: {
      params: { id: string };
      body: { title?: string; description?: string; status?: string; priority?: string; type?: string; order?: number };
      user: { id: string };
      set: { status?: number };
    }) => {
      const existing = await getTask(id);
      if (!existing) {
        set.status = 404;
        return { status: 404, message: "Task not found", data: null };
      }

      // Ownership check — only the creator (or an admin) may edit/move.
      if (existing.createdById !== user.id) {
        const me = await prismaClient.user.findUnique({ where: { id: user.id }, select: { role: true } });
        if (me?.role !== "ADMIN") {
          set.status = 403;
          return { status: 403, message: "You can only edit your own cards", data: null };
        }
      }

      const fields: { title?: string; description?: string | null; status?: string; priority?: string; type?: string; order?: number } = {};
      if (body.title !== undefined) fields.title = body.title.trim().slice(0, 140);
      if (body.description !== undefined) fields.description = body.description?.trim().slice(0, 2000) || null;
      if (body.status !== undefined && COLUMNS.includes(body.status)) fields.status = body.status;
      if (body.priority !== undefined) fields.priority = body.priority;
      if (body.type !== undefined) fields.type = body.type;
      if (body.order !== undefined) fields.order = body.order;

      const task = await updateTask(id, fields);
      return { status: 200, message: "Success", data: task };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ maxLength: 140 })),
        description: t.Optional(t.String({ maxLength: 2000 })),
        status: t.Optional(t.String()),
        priority: t.Optional(t.String()),
        type: t.Optional(t.String()),
        order: t.Optional(t.Number()),
      }),
      detail: {
        tags: ["Tracker"],
        summary: "Update / move tracker task (auth)",
        description: "Move a card between columns or edit it. Requires login.",
      },
    },
  );
