import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(authGuard)
  .delete(
    "/:id",
    async ({
      params: { id },
      user,
    }: {
      params: { id: string };
      user: { id: string };
    }) => {
      const chat = await prismaClient.aIChat.findFirst({
        where: { id, userId: user.id },
      });
      if (!chat) {
        return { status: 404, message: "Chat not found" };
      }

      await prismaClient.aIChatMessage.deleteMany({ where: { aIChatId: id } });
      await prismaClient.aIChat.delete({ where: { id } });

      return { status: 200, message: "Chat deleted" };
    },
    {
      detail: {
        tags: ["AI"],
        summary: "Delete AI Chat",
        description: "Delete an AI chat session and its messages (owner only).",
      },
    },
  );
