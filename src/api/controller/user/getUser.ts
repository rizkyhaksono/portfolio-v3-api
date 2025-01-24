import { createElysia } from "@/libs/elysia";
import userModel from "@/models/user.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(userModel)
  .use(authGuard)
  .get("/", async ({ user }) => {
    const userInfo = await prismaClient.User.findUnique({
      where: {
        id: user.id
      },
      include: {
        aiChat: true
      }
    });

    return {
      status: 200,
      data: userInfo
    }
  }, {
    detail: {
      tags: ["User"]
    }
  })