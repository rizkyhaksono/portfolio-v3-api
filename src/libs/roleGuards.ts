import Elysia from "elysia";
import { authGuard } from "./authGuard";
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
 * User guard - requires authenticated user (USER or ADMIN role)
 */
export const userGuard = new Elysia({
  name: "userGuard",
})
  .use(authGuard)
  .resolve({ as: "scoped" }, async ({ user }) => {
    if (!user || !user?.role || !["USER", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("User authentication required");
    }
    return { user };
  });
