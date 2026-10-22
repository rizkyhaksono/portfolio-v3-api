import { createElysia } from "@/libs/elysia";
import userModel from "@/models/user.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { PROFILE_SELECT, toProfile } from "@/utils/userProfile";

export default createElysia()
  .use(userModel)
  .use(authGuard)
  .get("/", async ({ user }: { user: { id: string } }) => {
    const userInfo = await prismaClient.user.findUnique({
      where: {
        id: user.id
      },
      select: PROFILE_SELECT,
    });

    return {
      status: 200,
      data: userInfo ? await toProfile(userInfo) : userInfo
    }
  }, {
    detail: {
      tags: ["User"],
      summary: "Get User Info",
      description: "Retrieve information about the authenticated user."
    }
  })
