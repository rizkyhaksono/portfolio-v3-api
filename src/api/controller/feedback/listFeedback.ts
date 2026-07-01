import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { t } from "elysia";
import { listFeedback, FEEDBACK_STATUSES, type FeedbackStatus } from "@/libs/feedbackStore";

/** Admin: list feedback, optionally filtered by status, paginated. */
export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .get(
    "/",
    async ({ query }: { query: { status?: string; page?: string; limit?: string } }) => {
      const valid = query.status && FEEDBACK_STATUSES.includes(query.status as FeedbackStatus)
        ? (query.status as FeedbackStatus)
        : undefined;
      const data = await listFeedback({
        status: valid,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 50,
      });
      return { status: 200, message: "Success", data };
    },
    {
      query: t.Object({ status: t.Optional(t.String()), page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
      detail: { tags: ["Feedback"], summary: "List feedback (admin)" },
    },
  );
