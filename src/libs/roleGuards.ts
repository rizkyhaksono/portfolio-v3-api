import Elysia from "elysia";
import { authGuard } from "./authGuard";
import { lucia } from "./luciaAuth";
import { ForbiddenException } from "@/constants/exceptions";

/**
 * Admin-only guard - requires authenticated user with ADMIN role
 */
export const adminGuard = new Elysia({
  name: "adminGuard",
})
  .use(authGuard)
  .resolve({ as: "scoped" }, async ({ user }) => {
    if (!user || user?.role !== "ADMIN") {
      throw new ForbiddenException("Admin access required");
    }
    return { user };
  });

/**
 * User guard - requires an authenticated user.
 *
 * Previously this wrapped authGuard with a redundant USER/ADMIN role check, but the
 * nested scoped-resolve failed to propagate `user` to handlers (Elysia named-plugin
 * dedup), causing 403 "User authentication required" on every endpoint that used it
 * (profile update, banner/avatar upload, etc). Every valid session already has a USER
 * or ADMIN role, so authGuard is equivalent — alias to it so `user` resolves correctly.
 */
export const userGuard = authGuard;

/**
 * Non-throwing admin check for public routes that show admins more (e.g. blog drafts).
 */
export async function isAdminRequest(headers: Headers): Promise<boolean> {
  const sessionId =
    lucia.readBearerToken(headers.get("authorization") ?? "") ??
    lucia.readSessionCookie(headers.get("cookie") ?? "");
  if (!sessionId) return false;
  const { user } = await lucia.validateSession(sessionId);
  return user?.role === "ADMIN";
}
