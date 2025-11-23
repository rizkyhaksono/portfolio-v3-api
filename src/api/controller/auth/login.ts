import { BadRequestException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import authModel from "@/models/auth.model";
import { password as bunPassword } from "bun";
import { lucia } from "@/libs/luciaAuth";
import { t } from "elysia";
import lokiLogger from "@/libs/lokiLogger";

export default createElysia()
  .use(authModel)
  .post("/login", async ({
    body: {
      email,
      password
    },
    cookie,
    set,
    env: {
      DOMAIN,
      PASSWORD_PEPPER
    },
  }: any) => {
    const user = await prismaClient.user.findUnique({
      where: {
        email,
      },
    });

    if (!user?.passwordSalt || !user?.hashedPassword) {
      lokiLogger.error({ message: "User not found", email });
      throw new BadRequestException("User not found.");
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
      lokiLogger.error({ message: "Password is invalid", email });
      throw new BadRequestException("Password is invalid.");
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