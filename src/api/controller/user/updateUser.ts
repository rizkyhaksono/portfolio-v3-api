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
    set,
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

    // Whitelist editable fields only — never trust the client for emailVerified/role.
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.headline !== undefined) data.headline = body.headline;
    if (body.location !== undefined) data.location = body.location;
    if (body.about !== undefined) data.about = body.about;
    if (body.bannerUrl !== undefined) data.bannerUrl = body.bannerUrl;
    // Changing the email must invalidate verification.
    if (body.email !== undefined && body.email !== userInfo.email) {
      data.email = body.email;
      data.emailVerified = false;
    }

    try {
      return await prismaClient.user.update({
        where: { id: user.id },
        data,
      });
    } catch (err) {
      if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
        set.status = 409;
        return { status: 409, message: "That email is already in use.", data: null };
      }
      throw err;
    }
  }, {
    body: "update.user.model",
    detail: {
      tags: ["User"],
      summary: "Update User",
      description: "Update user information by ID",
    }
  })