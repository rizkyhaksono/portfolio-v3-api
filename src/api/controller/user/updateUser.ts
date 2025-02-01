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

    const { updated_at, about, bannerUrl, email, email_verified, headline, location, name } = body

    await prismaClient.User.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? userInfo.name,
        email: email ?? userInfo.email,
        email_verified: email_verified ?? userInfo.email_verified,
        about: about ?? userInfo.about,
        bannerUrl: bannerUrl ?? userInfo.bannerUrl,
        headline: headline ?? userInfo.headline,
        location: location ?? userInfo.location,
        updated_at: updated_at || userInfo.updated_at || new Date(),
      }
    });
  }, {
    body: "update.user.model",
    detail: {
      tags: ["User"]
    }
  })