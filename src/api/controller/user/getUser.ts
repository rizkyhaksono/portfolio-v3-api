import { createElysia } from "@/libs/elysia";
import userModel from "@/models/user.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(userModel)
  .use(authGuard)
  .get("/", async ({ user }: { user: { id: string } }) => {
    const userInfo = await prismaClient.user.findUnique({
      where: {
        id: user.id
      },
      select: {
        id: true,
        email: true,
        name: true,
        about: true,
        emailVerified: true,
        avatarMinioKey: true,
        avatarUrl: true,
        bannerMinioKey: true,
        bannerUrl: true,
        role: true,
        headline: true,
        location: true,
        oauthAccounts: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return {
      status: 200,
      data: userInfo
    }
  }, {
    detail: {
      tags: ["User"],
      summary: "Get User Info",
      description: "Retrieve information about the authenticated user."
    }
  })