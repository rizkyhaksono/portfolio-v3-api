import { createElysia } from "@/libs/elysia";
import userModel from "@/models/user.model";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { getMinioPublicLink } from "@/utils/minioUtils";

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
        iconUrl: true,
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

    // Presigned MinIO URLs expire (max 7 days). Regenerate them from the stored
    // object keys on every read so avatar/banner never serve an expired URL.
    let avatarUrl = userInfo?.avatarUrl ?? null;
    let bannerUrl = userInfo?.bannerUrl ?? null;
    if (userInfo?.avatarMinioKey) {
      try { avatarUrl = await getMinioPublicLink(userInfo.avatarMinioKey); } catch { /* keep stored value */ }
    }
    if (userInfo?.bannerMinioKey) {
      try { bannerUrl = await getMinioPublicLink(userInfo.bannerMinioKey); } catch { /* keep stored value */ }
    }

    return {
      status: 200,
      data: userInfo ? { ...userInfo, avatarUrl, bannerUrl } : userInfo
    }
  }, {
    detail: {
      tags: ["User"],
      summary: "Get User Info",
      description: "Retrieve information about the authenticated user."
    }
  })