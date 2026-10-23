import { createHash } from "node:crypto";
import { getMinioPublicLink, PRESIGN_MAX_SECONDS } from "@/utils/minioUtils";
import { apiBaseUrl } from "@/utils/urls";

/** Never expires; `v` changes with the object key, so a new upload busts caches. */
export function stableAvatarUrl(userId: string, objectKey: string): string {
  const v = createHash("sha256").update(objectKey).digest("hex").slice(0, 12);
  return `${apiBaseUrl()}/v3/asset/avatar/${encodeURIComponent(userId)}?v=${v}`;
}

type AvatarFields = { id: string; avatarUrl: string | null; avatarMinioKey: string | null };

/** Embedded user projection: a MinIO avatar becomes the stable URL and the object key is dropped. */
export function withAvatarUrl<T extends AvatarFields>({ avatarMinioKey, ...user }: T): Omit<T, "avatarMinioKey"> {
  return { ...user, avatarUrl: avatarMinioKey ? stableAvatarUrl(user.id, avatarMinioKey) : user.avatarUrl };
}

/** Fields of the signed-in user's own profile (GET and PATCH /v3/me). Never the password hash or salt. */
export const PROFILE_SELECT = {
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
  oauthAccounts: { select: { provider: true } },
  createdAt: true,
  updatedAt: true,
} as const;

/** Replaces stored MinIO links with the stable avatar URL and a freshly presigned banner. */
export async function toProfile<T extends AvatarFields & { bannerMinioKey: string | null; bannerUrl: string | null }>(
  user: T
): Promise<T> {
  const bannerUrl = user.bannerMinioKey
    ? await getMinioPublicLink(user.bannerMinioKey, PRESIGN_MAX_SECONDS).catch(() => user.bannerUrl)
    : user.bannerUrl;
  const avatarUrl = user.avatarMinioKey ? stableAvatarUrl(user.id, user.avatarMinioKey) : user.avatarUrl;
  return { ...user, avatarUrl, bannerUrl };
}
