import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";
import { topOrder, createTask } from "@/libs/trackerStore";
import { withAvatarUrl } from "@/utils/userProfile";
import { t } from "elysia";

const COLUMNS = ["todo", "in_progress", "in_qa", "done"];

/** Auth: only logged-in users can add a card. */
export default createElysia()
  .use(authGuard)
  .post(
    "/",
    async ({
      body,
      user,
    }: {
      body: { title: string; description?: string; status?: string; priority?: string; type?: string };
      user: { id: string };
    }) => {
      const status = body.status && COLUMNS.includes(body.status) ? body.status : "todo";

      const [me, top] = await Promise.all([
        prismaClient.user.findUnique({
          where: { id: user.id },
          select: { id: true, name: true, avatarUrl: true, avatarMinioKey: true, iconUrl: true },
        }),
        topOrder(status),
      ]);

      // New cards go to the top of their column.
      const order = top !== null ? top - 1 : 1000;

      const task = await createTask({
        title: body.title.trim().slice(0, 140),
        description: body.description?.trim().slice(0, 2000) || null,
        status,
        priority: body.priority ?? "medium",
        type: body.type ?? "task",
        order,
        createdById: user.id,
        createdByName: me?.name ?? null,
        createdByAvatar: (me && withAvatarUrl(me).avatarUrl) ?? me?.iconUrl ?? null,
      });

      return { status: 200, message: "Success", data: task };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 140 }),
        description: t.Optional(t.String({ maxLength: 2000 })),
        status: t.Optional(t.String()),
        priority: t.Optional(t.UnionEnum(["high", "medium", "low"])),
        type: t.Optional(t.UnionEnum(["task", "bug", "story"])),
      }),
      detail: {
        tags: ["Tracker"],
        summary: "Create tracker task (auth)",
        description: "Add a card to the public board. Requires login.",
      },
    },
  );
