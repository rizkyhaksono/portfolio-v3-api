import {
  ConflictException,
  InternalServerErrorException
} from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import { lucia } from "@/libs/luciaAuth";
import { prismaClient } from "@/libs/prismaDatabase";
import { password as bunPassword } from "bun";
import { generateId } from "lucia";
import { alphabet, generateRandomString } from "oslo/crypto";
import authModel from "@/models/auth.model";
import { t } from "elysia";
import lokiLogger from "@/libs/lokiLogger";

export default createElysia()
  .use(authModel)
  .post("/signup", async ({
    body: {
      email,
      password,
      name
    },
    cookie,
    set,
    env: {
      DOMAIN,
      PASSWORD_PEPPER: passwordPepper
    },
  }: any) => {
    const existingUser = await prismaClient.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      lokiLogger.error({ message: "User already exists", email });
      throw new ConflictException("User already exists.");
    }

    const userId = generateId(15);
    const passwordSalt = generateRandomString(
      16,
      alphabet("a-z", "A-Z", "0-9")
    );

    const hashedPassword = await bunPassword.hash(
      passwordSalt + password + passwordPepper
    );

    try {
      const newUser = await prismaClient.user.create({
        data: {
          id: userId,
          email,
          hashedPassword: hashedPassword,
          passwordSalt,
          name,
        },
      });
      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      set.status = 201;
      cookie[sessionCookie.name]?.set({
        value: sessionCookie.value,
        domain: DOMAIN,
        ...sessionCookie.attributes,
      });

      return newUser;
    } catch (error) {
      lokiLogger.error({ message: "Failed to create user", error: error instanceof Error ? error.message : "Unknown error" });
      throw new InternalServerErrorException();
    }
  }, {
    detail: {
      tags: ["Auth"],
      summary: "Register a new user",
      description: "Create a new user account with email and password",
    },
    body: "auth.signup",
    response: {
      201: t.Object({
        id: t.String(),
        email: t.String(),
        name: t.String(),
        role: t.String(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      }),
    },
  })