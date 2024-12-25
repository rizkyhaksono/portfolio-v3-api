import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(aiModel)
  .use(authGuard)
  .get("/", async ({ user }) => {
    const aiChats = await prismaClient.AIChat.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        messages: true
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
    detail: {
      tags: ["AI"]
    }
  });
