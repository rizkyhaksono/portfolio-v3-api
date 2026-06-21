import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { t } from "elysia";

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
      body: { title: string };
      user: { id: string };
      set: { status?: number };
    }) => {
      const chat = await prismaClient.aIChat.findFirst({
        where: { id, userId: user.id },
      });
      if (!chat) {
        set.status = 404;
        return { status: 404, message: "Chat not found" };
      }

      const updated = await prismaClient.aIChat.update({
        where: { id },
        data: { chatTitle: body.title.trim().slice(0, 80) },
      });

      return {
        status: 200,
        message: "Success",
        data: { id: updated.id, title: updated.chatTitle },
      };
    },
    {
      body: t.Object({ title: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["AI"],
        summary: "Rename AI Chat",
        description: "Rename an AI chat session (owner only).",
      },
    },
  );
