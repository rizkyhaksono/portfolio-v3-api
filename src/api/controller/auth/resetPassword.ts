import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { BadRequestException } from "@/constants/exceptions";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { password as bunPassword } from "bun";
import { alphabet, generateRandomString } from "oslo/crypto";

export default createElysia().post(
  "/password-reset/confirm",
  async ({
    body,
    env: { PASSWORD_PEPPER: passwordPepper },
  }: {
    body: { token: string; password: string };
    env: { PASSWORD_PEPPER: string };
  }) => {
    const tokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(body.token))
    );

    const resetRecord = await prismaClient.passwordResetToken.findUnique({
      where: { hashedToken: tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (!passwordPepper) throw new BadRequestException("Server configuration error");

    const passwordSalt = generateRandomString(16, alphabet("a-z", "A-Z", "0-9"));
    const hashedPassword = await bunPassword.hash(
      passwordSalt + body.password + passwordPepper
    );

    await prismaClient.user.update({
      where: { id: resetRecord.userId },
      data: { hashedPassword, passwordSalt },
    });

    await prismaClient.passwordResetToken.delete({
      where: { userId: resetRecord.userId },
    });

    return { status: 200, message: "Password updated successfully" };
  },
  {
    body: t.Object({
      token: t.String(),
      password: t.String({ minLength: 8 }),
    }),
    detail: {
      tags: ["Authentication"],
      summary: "Confirm password reset",
    },
  }
);
