import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";
import { getMinioPublicLink } from "@/utils/minioUtils";

// Our own stable URL is stored in avatarUrl too; following it here would loop.
const isExternalUrl = (url: string | null | undefined): url is string =>
  !!url && /^https?:\/\//i.test(url) && !url.includes("/v3/asset/avatar/");

/** Public: 302 to the user's current avatar, so the URLs handed to clients never expire. */
export default createElysia().get(
  "/avatar/:userId",
  async ({ params: { userId } }: { params: { userId: string } }) => {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { avatarMinioKey: true, avatarUrl: true, iconUrl: true },
    });

    const location = user?.avatarMinioKey
      ? await getMinioPublicLink(user.avatarMinioKey, 60 * 60)
      : [user?.avatarUrl, user?.iconUrl].find(isExternalUrl);
    if (!location) throw new NotFoundException("Avatar not found");

    // Cached for half the presign lifetime, so a cached redirect never points at an expired URL.
    return new Response(null, {
      status: 302,
      headers: { Location: location, "Cache-Control": "public, max-age=1800" },
    });
  },
  {
    params: t.Object({ userId: t.String({ minLength: 1, maxLength: 64 }) }),
    detail: {
      tags: ["Assets"],
      summary: "Redirect to a user's avatar",
      description: "Public. Redirects to a freshly presigned MinIO URL or the user's external avatar URL.",
    },
  }
);
