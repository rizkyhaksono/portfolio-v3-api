import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { t } from "elysia";

export default createElysia()
  .use(aiModel)
  .use(authGuard)
  .get("/", async ({ query, user }: { query: { summary?: string }; user: { id: string } }) => {
    if (query.summary === "1" || query.summary === "true") {
      const chats = await prismaClient.aIChat.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, chatTitle: true, createdAt: true, _count: { select: { messages: true } } },
      });
      return {
        status: 200,
        data: chats.map((chat) => ({
          id: chat.id,
          title: chat.chatTitle,
          createdAt: chat.createdAt,
          messageCount: chat._count.messages,
        })),
      };
    }

    const aiChats = await prismaClient.aIChat.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } }
      }
    });

    const history = aiChats.map((chat: any) => ({
      id: chat.id,
      title: chat.chatTitle,
      createdAt: chat.createdAt,
      messages: chat.messages.map((message: any) => ({
        id: message.id,
        msg: message.msg,
        role: message.role,
        createdAt: message.createdAt
      }))
    }));
    return {
      status: 200,
      data: history
    };
  }, {
    query: t.Object({ summary: t.Optional(t.String({ maxLength: 8 })) }),
    detail: {
      tags: ["AI"],
      summary: "Get AI Chat History",
      description: "AI chat history for the authenticated user. `?summary=1` returns titles and message counts only.",
    }
  });
