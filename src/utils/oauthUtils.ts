import { prismaClient } from "@/libs/prismaDatabase";
import { lucia } from "@/libs/luciaAuth";
import { generateIdFromEntropySize } from "lucia";
import logger from "@/libs/lokiLogger";

export interface OAuthUserInfo {
  email: string;
  name: string;
  picture?: string;
  provider: string;
  providerId: string;
}

/**
 * Check if email is already registered with a different OAuth provider
 * This prevents users from logging in with different providers using the same email
 */
export async function checkEmailConflict(
  email: string,
  currentProvider: string
): Promise<{ hasConflict: boolean; existingProvider?: string }> {
  const user = await prismaClient.user.findUnique({
    where: { email },
    include: {
      oauthAccounts: true,
    },
  });

  if (!user) {
    return { hasConflict: false };
  }

  // Check if user has OAuth account with different provider
  const existingOAuthAccount = user.oauthAccounts.find(
    (account: { provider: string; providerId: string; userId: string }) => account.provider !== currentProvider
  );

  if (existingOAuthAccount) {
    logger.warn({
      message: "Email conflict detected",
      email,
      currentProvider,
      existingProvider: existingOAuthAccount.provider,
    });

    return {
      hasConflict: true,
      existingProvider: existingOAuthAccount.provider,
    };
  }

  return { hasConflict: false };
}

/**
 * Handle OAuth login/signup flow
 */
export async function handleOAuthUser(userInfo: OAuthUserInfo) {
  const { email, name, picture, provider, providerId } = userInfo;

  // Check for email conflicts
  const conflict = await checkEmailConflict(email, provider);
  if (conflict.hasConflict) {
    throw new Error(
      `This email is already registered with ${conflict.existingProvider}. Please sign in using that provider.`
    );
  }

  // Check if OAuth account exists
  const existingOAuthAccount = await prismaClient.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: providerId,
      },
    },
    include: {
      user: true,
    },
  });

  if (existingOAuthAccount) {
    // User exists, create session
    logger.info({
      message: "Existing OAuth user logged in",
      userId: existingOAuthAccount.userId,
      provider,
    });

    return existingOAuthAccount.user;
  }

  // Check if user exists by email (for linking accounts)
  const existingUser = await prismaClient.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Link OAuth account to existing user
    await prismaClient.oAuthAccount.create({
      data: {
        provider,
        providerAccountId: providerId,
        userId: existingUser.id,
      },
    });

    logger.info({
      message: "OAuth account linked to existing user",
      userId: existingUser.id,
      provider,
    });

    return existingUser;
  }

  // Create new user with OAuth account
  const userId = generateIdFromEntropySize(10);
  const newUser = await prismaClient.user.create({
    data: {
      id: userId,
      email,
      name,
      iconUrl: picture,
      emailVerified: true, // OAuth emails are pre-verified
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: providerId,
        },
      },
    },
  });

  logger.info({
    message: "New user created via OAuth",
    userId: newUser.id,
    provider,
  });

  return newUser;
}

/**
 * Create session for user
 */
export async function createUserSession(userId: string) {
  const session = await lucia.createSession(userId, {});
  return lucia.createSessionCookie(session.id);
}
