import { createElysia } from "@/libs/elysia";
import { generateState, generateCodeVerifier } from "arctic";
import { oauthProviders, type OAuthProvider } from "@/libs/oauthProviders";
import { BadRequestException } from "@/constants/exceptions";
import logger from "@/libs/lokiLogger";
import { t } from "elysia";

export default createElysia().get(
  "/:provider",
  async ({ params: { provider }, cookie, set }: any) => {
    const providerInstance = oauthProviders[provider as OAuthProvider];

    if (!providerInstance) {
      throw new BadRequestException(`OAuth provider '${provider}' is not configured`);
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // Store state and code verifier in cookies
    cookie.oauth_state.set({
      value: state,
      httpOnly: true,
      secure: Bun.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });

    cookie.oauth_code_verifier.set({
      value: codeVerifier,
      httpOnly: true,
      secure: Bun.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });

    let authUrl: URL;

    // Generate authorization URL based on provider
    switch (provider) {
      case "google":
        authUrl = await (providerInstance as any).createAuthorizationURL(state, codeVerifier, {
          scopes: ["profile", "email"],
        });
        break;
      case "github":
        authUrl = await (providerInstance as any).createAuthorizationURL(state, codeVerifier, ["user:email"]);
        break;
      case "discord":
        authUrl = await (providerInstance as any).createAuthorizationURL(state, codeVerifier, ["identify", "email"]);
        break;
      case "facebook":
        authUrl = await (providerInstance as any).createAuthorizationURL(state, codeVerifier, ["email", "public_profile"]);
        break;
      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    logger.info({
      message: "OAuth flow initiated",
      provider,
    });

    set.redirect = authUrl.toString();
  },
  {
    params: t.Object({
      provider: t.String(),
    }),
    detail: {
      tags: ["Authentication"],
      summary: "Initiate OAuth authentication",
      description: "Start OAuth flow for supported providers (google, github, discord, facebook)",
    },
  }
);
