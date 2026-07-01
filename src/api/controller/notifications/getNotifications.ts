import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { prismaClient } from "@/libs/prismaDatabase";
import { listFeedback } from "@/libs/feedbackStore";
import { listTasks } from "@/libs/trackerStore";
import { recentReactions } from "@/libs/reactionStore";

type NotifType = "feedback" | "chat" | "tracker" | "reaction";

interface AdminNotification {
  id: string;
  type: NotifType;
  title: string;
  detail?: string;
  href: string;
  createdAt: string;
}

/**
 * Admin notification feed — aggregates recent feedback, public-chat, tracker, and reaction
 * events. Which types are included is controlled by the admin's AdminSettings toggles
 * (reused fields → see the settings page mapping). Each source is isolated in try/catch.
 */
export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .get(
    "/",
    async ({ user }: { user: { id: string } }) => {
      const settings = await prismaClient.adminSettings.findUnique({ where: { userId: user.id } }).catch(() => null);
      const want = {
        feedback: settings?.emailNotifications ?? true,
        chat: settings?.pushNotifications ?? true,
        tracker: settings?.projectUpdates ?? true,
        reaction: settings?.securityAlerts ?? true,
      };

      const out: AdminNotification[] = [];

      if (want.feedback) {
        try {
          const { items } = await listFeedback({ status: "new", limit: 15 });
          for (const f of items) {
            out.push({
              id: `feedback:${f.id}`,
              type: "feedback",
              title: `New ${f.category} feedback`,
              detail: f.message.slice(0, 90),
              href: "/admin/dashboard/feedback",
              createdAt: f.createdAt.toISOString(),
            });
          }
        } catch {
          /* skip source */
        }
      }

      if (want.chat) {
        try {
          const msgs = await prismaClient.publicChatMessage.findMany({
            where: { replyToId: null, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 15,
            include: { user: { select: { name: true } } },
          });
          for (const m of msgs) {
            out.push({
              id: `chat:${m.id}`,
              type: "chat",
              title: `New message from ${m.user?.name ?? "someone"}`,
              detail: m.message.slice(0, 90),
              href: "/chat",
              createdAt: m.createdAt.toISOString(),
            });
          }
        } catch {
          /* skip source */
        }
      }

      if (want.tracker) {
        try {
          const tasks = await listTasks();
          const recent = [...tasks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 15);
          for (const t of recent) {
            out.push({
              id: `tracker:${t.id}`,
              type: "tracker",
              title: `New card: ${t.title}`,
              detail: `${t.key} · ${t.status}`,
              href: "/tracker",
              createdAt: t.createdAt.toISOString(),
            });
          }
        } catch {
          /* skip source */
        }
      }

      if (want.reaction) {
        try {
          const reacts = await recentReactions(15);
          for (const r of reacts) {
            out.push({
              id: `reaction:${r.id}`,
              type: "reaction",
              title: `New clap on a ${r.targetType}`,
              href: r.targetType === "project" ? `/project/${r.targetId}` : "/blog",
              createdAt: r.createdAt.toISOString(),
            });
          }
        } catch {
          /* skip source */
        }
      }

      out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return { status: 200, message: "Success", data: { notifications: out.slice(0, 20) } };
    },
    {
      detail: { tags: ["Notifications"], summary: "Admin notification feed (aggregated events)" },
    },
  );
