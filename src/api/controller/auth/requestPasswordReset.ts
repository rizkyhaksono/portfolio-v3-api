import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { BadRequestException } from "@/constants/exceptions";
import { generateId } from "lucia";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";

export default createElysia().post(
  "/password-reset/request",
  async ({ body }: { body: { email: string } }) => {
    const user = await prismaClient.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return {
        status: 200,
        message: "If the email exists, a reset link has been sent.",
      };
    }

    const tokenId = generateId(32);
    const tokenHash = encodeHexLowerCase(sha256(new TextEncoder().encode(tokenId)));

    await prismaClient.passwordResetToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        hashedToken: tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
      update: {
        hashedToken: tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${tokenId}`;

    return {
      status: 200,
      message: "If the email exists, a reset link has been sent.",
      resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    };
  },
  {
    body: t.Object({
      email: t.String({ format: "email" }),
    }),
    detail: {
      tags: ["Authentication"],
      summary: "Request password reset",
    },
  }
);
