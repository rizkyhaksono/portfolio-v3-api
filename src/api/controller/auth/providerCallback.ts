import { createElysia } from "@/libs/elysia";
import { oauthProviders, type OAuthProvider } from "@/libs/oauthProviders";
import { handleOAuthUser, createUserSession } from "@/utils/oauthUtils";
import { BadRequestException, UnauthorizedException } from "@/constants/exceptions";
import logger from "@/libs/lokiLogger";
import { lucia } from "@/libs/luciaAuth";
import { t } from "elysia";

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface GitHubUserInfo {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
}

interface DiscordUserInfo {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

interface FacebookUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export default createElysia().get(
  "/:provider/callback",
  async ({ params: { provider }, query, cookie, set }: any) => {
    const { code, state } = query as { code?: string; state?: string };
    const storedState = cookie.oauth_state.value;
    const codeVerifier = cookie.oauth_code_verifier.value;

    if (!code || !state || !storedState || state !== storedState) {
      logger.error({
        message: "OAuth state mismatch or missing parameters",
        provider,
      });
      throw new BadRequestException("Invalid OAuth state");
    }

    if (!codeVerifier) {
      throw new BadRequestException("Missing code verifier");
    }

    const providerInstance = oauthProviders[provider as OAuthProvider];

    if (!providerInstance) {
      throw new BadRequestException(`OAuth provider '${provider}' is not configured`);
    }

    try {
      let tokens;
      let userInfo;

      switch (provider) {
        case "google": {
          logger.info({
            message: "Validating Google authorization code",
            codeLength: code.length,
            codeVerifierLength: codeVerifier.length,
          });
          
          tokens = await (providerInstance as any).validateAuthorizationCode(code, codeVerifier);
          
          logger.info({
            message: "Google tokens received successfully",
          });
          
          const accessToken = tokens.accessToken();
          
          const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          const data = (await response.json()) as GoogleUserInfo;
          
          userInfo = {
            email: data.email,
            name: data.name,
            picture: data.picture,
            provider: "google",
            providerId: data.sub,
          };
          break;
        }

        case "github": {
          tokens = await (providerInstance as any).validateAuthorizationCode(code, codeVerifier);
          const response = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${tokens.accessToken()}`,
            },
          });
          const data = (await response.json()) as GitHubUserInfo;

          // Get email if not in profile
          let email = data.email;
          if (!email) {
            const emailResponse = await fetch("https://api.github.com/user/emails", {
              headers: {
                Authorization: `Bearer ${tokens.accessToken()}`,
              },
            });
            const emails = await emailResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
            const primaryEmail = emails.find(e => e.primary && e.verified);
            email = primaryEmail?.email || emails[0]?.email;
          }

          if (!email) {
            throw new UnauthorizedException("Unable to retrieve email from GitHub");
          }

          userInfo = {
            email,
            name: data.name || `github_${data.id}`,
            picture: data.avatar_url,
            provider: "github",
            providerId: String(data.id),
          };
          break;
        }

        case "discord": {
          tokens = await (providerInstance as any).validateAuthorizationCode(code, codeVerifier);
          const response = await fetch("https://discord.com/api/users/@me", {
            headers: {
              Authorization: `Bearer ${tokens.accessToken()}`,
            },
          });
          const data = (await response.json()) as DiscordUserInfo;
          userInfo = {
            email: data.email,
            name: data.username,
            picture: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined,
            provider: "discord",
            providerId: data.id,
          };
          break;
        }

        case "facebook": {
          tokens = await (providerInstance as any).validateAuthorizationCode(code, codeVerifier);
          const response = await fetch(
            "https://graph.facebook.com/me?fields=id,name,email,picture",
            {
              headers: {
                Authorization: `Bearer ${tokens.accessToken()}`,
              },
            }
          );
          const data = (await response.json()) as FacebookUserInfo;
          userInfo = {
            email: data.email,
            name: data.name,
            picture: data.picture?.data?.url,
            provider: "facebook",
            providerId: data.id,
          };
          break;
        }

        default:
          throw new BadRequestException(`Unsupported provider: ${provider}`);
      }

      const user = await handleOAuthUser(userInfo);
      const sessionCookie = await createUserSession(user.id);

      // Set session cookie
      cookie[lucia.sessionCookieName].set({
        value: sessionCookie.value,
        ...sessionCookie.attributes,
      });

      // Clear OAuth cookies
      cookie.oauth_state.remove();
      cookie.oauth_code_verifier.remove();
      
      logger.info({
        message: "OAuth authentication successful",
        provider,
        userId: user.id,
        sessionId: sessionCookie.value,
      });

      // Redirect to frontend with token in URL
      const frontendUrl = Bun.env.FRONTEND_URL || "http://localhost:3000";
      const callbackUrl = `${frontendUrl}/auth/callback?token=${sessionCookie.value}`;
      set.redirect = callbackUrl;
      set.status = 302;
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: callbackUrl
        }
      });
    } catch (error) {
      logger.error({
        message: "OAuth authentication failed",
        provider,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error instanceof Error
        ? error
        : new UnauthorizedException("OAuth authentication failed");
    }
  },
  {
    params: t.Object({
      provider: t.String(),
    }),
    query: t.Object({
      code: t.String(),
      state: t.String(),
    }),
    detail: {
      tags: ["Authentication"],
      summary: "OAuth callback handler",
      description: "Handle OAuth callback from provider",
    },
  }
);
