import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { t } from "elysia";
import { updateStatus, FEEDBACK_STATUSES, type FeedbackStatus } from "@/libs/feedbackStore";

/** Admin: change a feedback item's status (new | read | archived). */
export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .patch(
    "/:id",
    async ({ params: { id }, body, set }: { params: { id: string }; body: { status: string }; set: { status?: number } }) => {
      if (!FEEDBACK_STATUSES.includes(body.status as FeedbackStatus)) {
        set.status = 400;
        return { status: 400, message: "Invalid status", data: null };
      }
      const fb = await updateStatus(id, body.status as FeedbackStatus);
      if (!fb) {
        set.status = 404;
        return { status: 404, message: "Feedback not found", data: null };
      }
      return { status: 200, message: "Success", data: fb };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ status: t.String() }),
      detail: { tags: ["Feedback"], summary: "Update feedback status (admin)" },
    },
  );
