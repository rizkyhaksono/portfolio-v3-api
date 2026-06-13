import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import userModel from "@/models/user.model";
import { BadRequestException, ForbiddenException } from "@/constants/exceptions";
import { userGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(userModel)
  .use(userGuard)
  .use(authGuard)
  .patch("/:id", async ({
    body,
    user,
    logestic
  }) => {
    if (!user) {
      throw new ForbiddenException("Authentication required.");
    }

    // Always operate on the authenticated user's own record and ignore the URL :id.
    // This prevents IDOR (a caller can never edit another user) and avoids a silent
    // no-op when the client sends a stale/mismatched id.
    const userInfo = await prismaClient.user.findUnique({
      where: { id: user.id }
    });

    if (!userInfo) {
      logestic.error("User not found.");
      throw new BadRequestException("User not found.");
    };

    return await prismaClient.user.update({
      where: { id: user.id },
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