import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { addReaction, getCount, hasReacted, hashIp, REACTION_TARGETS, type ReactionTarget } from "@/libs/reactionStore";
import { getClientIp } from "@/utils/clientIp";
import { checkAiRateLimit } from "@/libs/aiRateLimit";

/** Public: add one clap for a target, deduped per IP. Rate-limited per IP. */
export default createElysia().post(
  "/",
  async ({
    body,
    request,
    server,
    set,
  }: {
    body: { targetType: string; targetId: string };
    request: Request;
    server: any;
    set: { status?: number };
  }) => {
    const type = body.targetType as ReactionTarget;
    if (!REACTION_TARGETS.includes(type)) {
      set.status = 400;
      return { status: 400, message: "Invalid targetType", data: null };
    }

    const ip = getClientIp(request, server);
    const rate = checkAiRateLimit(`ip-react:${ip}`);
    if (!rate.allowed) {
      set.status = 429;
      return { status: 429, message: "Too many reactions. Slow down.", data: null };
    }

    const ipHash = hashIp(ip);
    const already = await hasReacted(type, body.targetId, ipHash);
    const count = already ? await getCount(type, body.targetId) : await addReaction(type, body.targetId, ipHash);
    return { status: 200, message: "Success", data: { count, reacted: true } };
  },
  {
    body: t.Object({ targetType: t.String(), targetId: t.String({ minLength: 1, maxLength: 200 }) }),
    detail: { tags: ["Reactions"], summary: "Add a clap (anonymous, per-IP deduped)" },
  },
);
