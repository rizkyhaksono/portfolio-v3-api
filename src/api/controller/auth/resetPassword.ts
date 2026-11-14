import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { BadRequestException, TooManyRequestsException } from "@/constants/exceptions";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { password as bunPassword } from "bun";
import { alphabet, generateRandomString } from "oslo/crypto";
import { checkAuthRateLimit } from "@/libs/aiRateLimit";
import { lockUserForPasswordChange } from "@/libs/passwordSession";
import { getClientIp } from "@/utils/clientIp";

export default createElysia().post(
  "/password-reset/confirm",
  async ({
    body,
    request,
    server,
    env: { PASSWORD_PEPPER: passwordPepper },
  }: {
    body: { token: string; password: string };
    request: Request;
    server: any;
    env: { PASSWORD_PEPPER: string };
  }) => {
    const ip = getClientIp(request, server);
    const rate = checkAuthRateLimit(`pwconfirm:${ip}`);
    if (!rate.allowed) {
      throw new TooManyRequestsException(`Too many attempts. Retry in ${rate.retryAfterSeconds ?? 60}s.`);
    }

    const tokenHash = encodeHexLowerCase(
      sha256(new TextEncoder().encode(body.token))
    );

    const resetRecord = await prismaClient.passwordResetToken.findUnique({
      where: { hashedToken: tokenHash },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (!passwordPepper) throw new BadRequestException("Server configuration error");

    const passwordSalt = generateRandomString(16, alphabet("a-z", "A-Z", "0-9"));
    const hashedPassword = await bunPassword.hash(
      passwordSalt + body.password + passwordPepper
    );

    // One transaction, so the token can never outlive the password change it authorised.
    // The user row stays locked until every existing session is gone. Login takes the
    // same lock and re-reads the hash before inserting, so an in-flight login cannot
    // keep a session for the old password. Reset is unauthenticated, so there is no
    // current session to keep; the next login creates a new one.
    await prismaClient.$transaction(async (tx) => {
      await lockUserForPasswordChange(tx, resetRecord.userId);
      const fresh = await tx.passwordResetToken.findUnique({
        where: { hashedToken: tokenHash },
      });
      if (!fresh || fresh.userId !== resetRecord.userId || fresh.expiresAt < new Date()) {
        throw new BadRequestException("Invalid or expired reset token");
      }
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { hashedPassword, passwordSalt },
      });
      await tx.passwordResetToken.delete({
        where: { userId: resetRecord.userId },
      });
      await tx.session.deleteMany({
        where: { userId: resetRecord.userId },
      });
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
