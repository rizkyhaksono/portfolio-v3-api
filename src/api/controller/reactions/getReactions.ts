import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { getCount, hasReacted, hashIp, REACTION_TARGETS, type ReactionTarget } from "@/libs/reactionStore";
import { getClientIp } from "@/utils/clientIp";

/** Public: returns the clap count for a target + whether this visitor (by IP) already clapped. */
export default createElysia().get(
  "/",
  async ({
    query,
    request,
    server,
    set,
  }: {
    query: { targetType: string; targetId: string };
    request: Request;
    server: any;
    set: { status?: number };
  }) => {
    const type = query.targetType as ReactionTarget;
    if (!REACTION_TARGETS.includes(type)) {
      set.status = 400;
      return { status: 400, message: "Invalid targetType", data: null };
    }
    const ipHash = hashIp(getClientIp(request, server));
    const [count, reacted] = await Promise.all([getCount(type, query.targetId), hasReacted(type, query.targetId, ipHash)]);
    return { status: 200, message: "Success", data: { count, reacted } };
  },
  {
    query: t.Object({ targetType: t.String(), targetId: t.String({ minLength: 1, maxLength: 200 }) }),
    detail: { tags: ["Reactions"], summary: "Get clap count + whether this IP reacted (public)" },
  },
);
