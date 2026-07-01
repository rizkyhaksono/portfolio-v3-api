import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { createFeedback, FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/libs/feedbackStore";
import { getClientIp } from "@/utils/clientIp";
import { checkAiRateLimit } from "@/libs/aiRateLimit";

/** Public: submit feedback / a suggestion. Rate-limited per IP. */
export default createElysia().post(
  "/",
  async ({
    body,
    request,
    server,
    set,
  }: {
    body: { message: string; category?: string; email?: string; pageUrl?: string };
    request: Request;
    server: any;
    set: { status?: number };
  }) => {
    const ip = getClientIp(request, server);
    const rate = checkAiRateLimit(`ip-feedback:${ip}`);
    if (!rate.allowed) {
      set.status = 429;
      return { status: 429, message: "Too many submissions. Try again shortly.", data: null };
    }

    const category = (body.category && FEEDBACK_CATEGORIES.includes(body.category as FeedbackCategory)
      ? body.category
      : "general") as FeedbackCategory;

    const fb = await createFeedback({
      message: body.message.trim().slice(0, 2000),
      category,
      email: body.email?.trim().slice(0, 200) || null,
      pageUrl: body.pageUrl?.trim().slice(0, 500) || null,
      ip,
    });

    return { status: 200, message: "Success", data: { id: fb.id } };
  },
  {
    body: t.Object({
      message: t.String({ minLength: 2, maxLength: 2000 }),
      category: t.Optional(t.String()),
      email: t.Optional(t.String({ maxLength: 200 })),
      pageUrl: t.Optional(t.String({ maxLength: 500 })),
    }),
    detail: { tags: ["Feedback"], summary: "Submit feedback (public)" },
  },
);
