import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .use(authGuard)
  .patch(
    "/settings",
    async ({ user, body }: { user: { id: string }; body: Record<string, unknown> }) => {
      const settings = await prismaClient.adminSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          website: (body.website as string) ?? null,
          emailNotifications: body.emailNotifications as boolean ?? true,
          pushNotifications: body.pushNotifications as boolean ?? false,
          weeklyDigest: body.weeklyDigest as boolean ?? true,
          projectUpdates: body.projectUpdates as boolean ?? true,
          securityAlerts: body.securityAlerts as boolean ?? true,
          theme: (body.theme as string) ?? "system",
          language: (body.language as string) ?? "en",
          timezone: (body.timezone as string) ?? "UTC",
        },
        update: {
          ...(body.website !== undefined && { website: body.website as string }),
          ...(body.emailNotifications !== undefined && {
            emailNotifications: body.emailNotifications as boolean,
          }),
          ...(body.pushNotifications !== undefined && {
            pushNotifications: body.pushNotifications as boolean,
          }),
          ...(body.weeklyDigest !== undefined && {
            weeklyDigest: body.weeklyDigest as boolean,
          }),
          ...(body.projectUpdates !== undefined && {
            projectUpdates: body.projectUpdates as boolean,
          }),
          ...(body.securityAlerts !== undefined && {
            securityAlerts: body.securityAlerts as boolean,
          }),
          ...(body.theme !== undefined && { theme: body.theme as string }),
          ...(body.language !== undefined && { language: body.language as string }),
          ...(body.timezone !== undefined && { timezone: body.timezone as string }),
        },
      });

      return { status: 200, data: settings };
    },
    {
      body: t.Object({
        website: t.Optional(t.String()),
        emailNotifications: t.Optional(t.Boolean()),
        pushNotifications: t.Optional(t.Boolean()),
        weeklyDigest: t.Optional(t.Boolean()),
        projectUpdates: t.Optional(t.Boolean()),
        securityAlerts: t.Optional(t.Boolean()),
        theme: t.Optional(t.Union([t.Literal("light"), t.Literal("dark"), t.Literal("system")])),
        language: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Settings"],
        summary: "Update admin settings",
        description: "Save notification and appearance preferences.",
      },
    }
  );
