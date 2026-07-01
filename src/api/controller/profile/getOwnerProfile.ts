import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { getMinioPublicLink } from "@/utils/minioUtils";

/**
 * Public owner profile — the single portfolio owner (the ADMIN-role user). Powers the public
 * left sidebar + home intro so editing the admin Profile settings updates the live site.
 * Avatar/banner URLs are regenerated from MinIO keys (mirrors getUser) so they never expire.
 */
export default createElysia().get(
  "/",
  async () => {
    const owner = await prismaClient.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        headline: true,
        location: true,
        about: true,
        avatarUrl: true,
        avatarMinioKey: true,
        bannerUrl: true,
        bannerMinioKey: true,
        iconUrl: true,
      },
    });

    if (!owner) return { status: 200, message: "Success", data: null };

    let avatarUrl = owner.avatarUrl ?? owner.iconUrl ?? null;
    let bannerUrl = owner.bannerUrl ?? null;
    if (owner.avatarMinioKey) {
      try { avatarUrl = await getMinioPublicLink(owner.avatarMinioKey); } catch { /* keep stored value */ }
    }
    if (owner.bannerMinioKey) {
      try { bannerUrl = await getMinioPublicLink(owner.bannerMinioKey); } catch { /* keep stored value */ }
    }

    const settings = await prismaClient.adminSettings
      .findUnique({ where: { userId: owner.id }, select: { website: true } })
      .catch(() => null);

    return {
      status: 200,
      message: "Success",
      data: {
        name: owner.name,
        headline: owner.headline,
        location: owner.location,
        about: owner.about,
        avatarUrl,
        bannerUrl,
        website: settings?.website ?? null,
      },
    };
  },
  {
    detail: { tags: ["Profile"], summary: "Public owner profile" },
  },
);
