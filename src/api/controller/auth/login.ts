import { BadRequestException, TooManyRequestsException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import authModel from "@/models/auth.model";
import { password as bunPassword } from "bun";
import { lucia } from "@/libs/luciaAuth";
import { t } from "elysia";
import lokiLogger from "@/libs/lokiLogger";
import { checkAuthRateLimit } from "@/libs/aiRateLimit";
import { getClientIp } from "@/utils/clientIp";

// A throwaway hash, made once, so a login for an unknown email still runs one argon2 verify.
let missHashValue: Promise<string> | undefined;
const missHash = () => (missHashValue ??= bunPassword.hash(crypto.randomUUID()));

export default createElysia()
  .use(authModel)
  .post("/login", async ({
    body: {
      email,
      password
    },
    cookie,
    set,
    request,
    server,
    env: {
      DOMAIN,
      PASSWORD_PEPPER
    },
  }: any) => {
    const ip = getClientIp(request, server);
    const rate = checkAuthRateLimit(`login:${ip}`);
    if (!rate.allowed) {
      throw new TooManyRequestsException(`Too many login attempts. Retry in ${rate.retryAfterSeconds ?? 60}s.`);
    }

    const user = await prismaClient.user.findUnique({
      where: {
        email,
      },
    });

    // Generic message for both branches — avoids user enumeration (don't reveal
    // whether the email exists vs the password was wrong).
    if (!user?.passwordSalt || !user?.hashedPassword) {
      // Spend the same argon2 time as a real check, so response time does not reveal which emails exist.
      await bunPassword.verify(password, await missHash());
      lokiLogger.error({ message: "Login failed: user not found or has no password", userId: user?.id });
      throw new BadRequestException("Invalid email or password.");
    }

    const passwordPepper = PASSWORD_PEPPER;

    if (!passwordPepper) {
      lokiLogger.error({ message: "Password pepper is not set" });
      throw new Error("Password pepper is not set.");
    }

    if (
      !(await bunPassword.verify(
        user.passwordSalt + password + passwordPepper,
        user.hashedPassword
      ))
    ) {
      lokiLogger.error({ message: "Login failed: invalid password", userId: user.id });
      throw new BadRequestException("Invalid email or password.");
    }

    try {
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      set.status = 200;
      cookie[sessionCookie.name]?.set({
        value: sessionCookie.value,
        domain: DOMAIN,
        ...sessionCookie.attributes,
      });

      return {
        status: "200",
        token: sessionCookie.value,
      };
    } catch (error) {
      lokiLogger.error({ message: "Failed to create session", error: error instanceof Error ? error.message : "Unknown error" });
      set.status = 500;
      throw new Error("Failed to create session.");
    }
  }, {
    detail: {
      tags: ["Auth"],
      summary: "Login with email and password",
      description: "Authenticate user and create session",
    },
    body: "auth.login",
    response: {
      200: t.Object({
        status: t.String(),
        token: t.String(),
      }),
    },
  })