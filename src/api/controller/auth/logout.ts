import { BadRequestException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import { lucia } from "@/libs/luciaAuth";

export default createElysia()
  .post("/logout", async (
    { cookie,
      env: {
        DOMAIN
      },
    }: {
      cookie: Record<string, any>;
      env: {
        DOMAIN: string;
      }
    }) => {
    const sessionCookie = cookie[lucia.sessionCookieName];

    if (!sessionCookie?.value) throw new BadRequestException("Session not found");

    await lucia.invalidateSession(sessionCookie.value);
    const blankSessionCookie = lucia.createBlankSessionCookie();

    sessionCookie.set({
      value: blankSessionCookie.value,
      domain: DOMAIN,
      ...blankSessionCookie.attributes,
    });
  }, {
    detail: {
      tags: ["Auth"],
      summary: "Logout",
      description: "Endpoint to log out the authenticated user by invalidating their session.",
    }
  })