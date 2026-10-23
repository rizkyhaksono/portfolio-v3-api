import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import {
  BadRequestException,
  TooManyRequestsException,
  UnauthorizedException,
} from "@/constants/exceptions";
import { consumeHandoffCode } from "@/libs/oauthHandoff";
import { checkRateLimit } from "@/libs/aiRateLimit";
import { getClientIp, hasValidInternalKey } from "@/utils/clientIp";

export default createElysia().post(
  "/oauth/exchange",
  async ({ body, request, server }: { body: { code: string }; request: Request; server: any }) => {
    if (process.env.INTERNAL_PROXY_SECRET && !hasValidInternalKey(request)) {
      throw new UnauthorizedException();
    }

    const rate = checkRateLimit(`oauth-exchange:${getClientIp(request, server)}`, 10, 60 * 1000);
    if (!rate.allowed) {
      throw new TooManyRequestsException(`Too many attempts. Retry in ${rate.retryAfterSeconds ?? 60}s.`);
    }

    const sessionId = consumeHandoffCode(body.code);
    if (!sessionId) throw new BadRequestException("Sign-in link expired. Try again.");

    return { status: 200, token: sessionId };
  },
  {
    body: t.Object({
      code: t.String({ minLength: 20, maxLength: 200 }),
    }),
    detail: {
      tags: ["Authentication"],
      summary: "Exchange an OAuth handoff code for a session token",
      description: "Single-use code from the OAuth callback redirect, valid for 60 seconds.",
    },
  }
);
