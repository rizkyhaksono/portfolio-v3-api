import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import userModel from "@/models/user.model";
import { BadRequestException } from "@/constants/exceptions";
import { userGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(userModel)
  .use(userGuard)
  .use(authGuard)
  .patch("/:id", async ({
    body,
    params: {
      id
    },
    logestic
  }) => {
    const userInfo = await prismaClient.user.findUnique({
      where: { id }
    });

    if (!userInfo) {
      logestic.error("User not found.");
      throw new BadRequestException("User not found.");
    };

    return await prismaClient.user.update({
      where: { id },
      data: {
        ...body
      }
    });
  }, {
    body: "update.user.model",
    detail: {
      tags: ["User"],
      summary: "Update User",
      description: "Update user information by ID",
    }
  })