import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .get("/count", async () => {
    const total = await prismaClient.user.count();
    return { status: 200, data: { total } };
  }, {
    detail: {
      tags: ["User"],
      summary: "Count users (admin)",
      description: "Total number of registered users.",
    }
  });
