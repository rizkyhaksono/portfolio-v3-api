import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";
import { getTask, deleteTask } from "@/libs/trackerStore";
import { t } from "elysia";

/** Auth: only the card's creator (or an admin) can delete it. */
export default createElysia()
  .use(authGuard)
  .delete(
    "/:id",
    async ({
      params: { id },
      user,
      set,
    }: {
      params: { id: string };
      user: { id: string };
      set: { status?: number };
    }) => {
      const task = await getTask(id);
      if (!task) {
        set.status = 404;
        return { status: 404, message: "Task not found", data: null };
      }

      if (task.createdById !== user.id) {
        const me = await prismaClient.user.findUnique({ where: { id: user.id }, select: { role: true } });
        if (me?.role !== "ADMIN") {
          set.status = 403;
          return { status: 403, message: "You can only delete your own cards", data: null };
        }
      }

      await deleteTask(id);
      return { status: 200, message: "Success", data: null };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Tracker"],
        summary: "Delete tracker task (auth)",
        description: "Delete a card (creator or admin only). Requires login.",
      },
    },
  );
