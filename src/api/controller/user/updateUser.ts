import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import userModel from "@/models/user.model";
import { BadRequestException } from "@/constants/exceptions";

export default createElysia()
  .use(userModel)
  .use(authGuard)
  .patch("/:id", async ({
    body,
    params: {
      id
    },
    logestic
  }) => {
    const userInfo = await prismaClient.User.findUnique({
      where: { id: parseInt(id) }
    });

    if (!userInfo) {
      logestic.error("User not found.");
      throw new BadRequestException("User not found.");
    };

    await prismaClient.User.update({
      where: { id: parseInt(id) },
      data: body
    });
  }, {
    body: "user.model",
    detail: {
      tags: ["User"]
    }
  })