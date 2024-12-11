import Elysia, { t } from "elysia";
import { type User, verifyRequestOrigin } from "lucia";
import { lucia } from "./luciaAuth";
import {
  ForbiddenException,
  UnauthorizedException
} from "@/constants/exceptions";

const sessionCookieName = lucia.sessionCookieName;

const authGuard = new Elysia({
  name: "authGuard"
}).guard({
  cookie: t.Object({
    [sessionCookieName]: t.Optional(t.String())
  }),
  headers: t.Object({
    origin: t.Optional(t.String()),
    host: t.Optional(t.String()),
    authorization: t.Optional(t.String())
  })
}).resolve({ as: "scoped" }, async ({ cookie, headers: { origin, host, authorization }, request: { method } }): Promise<{ user: User }> => {
  const sessionCookie = cookie[sessionCookieName];
  const sessionId: string | null | undefined =
    lucia.readBearerToken(authorization ?? "") ?? sessionCookie?.value;

  if (
    !authorization &&
    method !== "GET" &&
    (!origin ||
      !host ||
      !verifyRequestOrigin(origin, [
        "https://rizkyhaksono.vercel.app",
        "rizkyhaksono.vercel.app",
        "https://rizkyhaksono.natee.my.id",
        "rizkyhaksono.natee.my.id",
        "https://natee.me",
        "natee.me",
        "https://natee.my.id",
        "natee.my.id",
        "http://localhost:3000",
        "localhost:3000",
      ]))
  ) {
    throw new ForbiddenException("Invalid origin");
  }
  if (!sessionId) {
    throw new UnauthorizedException();
  }

  const { session, user } = await lucia.validateSession(sessionId || "");

  if (!session) {
    const newSessionCookie = lucia.createBlankSessionCookie();
    sessionCookie?.set({
      value: newSessionCookie.value,
      ...newSessionCookie.attributes,
    });
    throw new UnauthorizedException();
  }

  if (session?.fresh) {
    const newSessionCookie = lucia.createSessionCookie(sessionId || "");
    sessionCookie?.set({
      value: newSessionCookie.value,
      ...newSessionCookie.attributes,
    });
  }

  return { user };
});

export { authGuard };