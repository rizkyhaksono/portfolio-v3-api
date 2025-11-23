import { createElysia } from "@/libs/elysia";
import aiModel from "@/models/ai.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(aiModel)
  .use(authGuard)
  .get("/:id", async ({ params: { id }, user }: { params: { id: string }; user: { id: string } }) => {
    const aiChat = await prismaClient.aIChat.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        messages: true
      }
    });

    if (!aiChat) {
      return {
        status: 404,
        message: "AI Chat not found"
      };
    }

    return {
      status: 200,
      data: {
        id: aiChat.id,
        title: aiChat.chatTitle,
        createdAt: aiChat.createdAt,
        messages: aiChat.messages.map((message: any) => ({
          id: message.id,
          msg: message.msg,
          role: message.role,
          createdAt: message.createdAt
        }))
      }
    };
  }, {
    detail: {
      tags: ["AI"],
      summary: "Get AI Chat by ID",
      description: "Endpoint to retrieve a specific AI chat session by its ID.",
    }
  });