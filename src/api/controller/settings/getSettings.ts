import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";

const defaultSettings = {
  website: "",
  emailNotifications: true,
  pushNotifications: false,
  weeklyDigest: true,
  projectUpdates: true,
  securityAlerts: true,
  theme: "system",
  language: "en",
  timezone: "UTC",
};

export default createElysia()
  .use(authGuard)
  .get("/settings", async ({ user }: { user: { id: string } }) => {
    const settings = await prismaClient.adminSettings.findUnique({
      where: { userId: user.id },
    });

    return {
      status: 200,
      data: settings ?? { ...defaultSettings, userId: user.id },
    };
  }, {
    detail: {
      tags: ["Settings"],
      summary: "Get admin settings",
      description: "Retrieve notification and appearance preferences for the authenticated user.",
    },
  });
