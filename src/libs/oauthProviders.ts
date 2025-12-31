import { Google, GitHub, Discord, Facebook } from "arctic";

const baseURL = Bun.env.BASE_URL ?? "http://localhost:3005";

const googleClientId = Bun.env.GOOGLE_CLIENT_ID!;
const googleClientSecret = Bun.env.GOOGLE_CLIENT_SECRET!;

export const google = new Google(
  googleClientId,
  googleClientSecret,
  `${baseURL}/v3/auth/google/callback`
);

const githubClientId = Bun.env.GITHUB_CLIENT_ID;
const githubClientSecret = Bun.env.GITHUB_CLIENT_SECRET;

export const github = githubClientId && githubClientSecret
  ? new GitHub(githubClientId, githubClientSecret, `${baseURL}/v3/auth/github/callback`)
  : null;

const discordClientId = Bun.env.DISCORD_CLIENT_ID;
const discordClientSecret = Bun.env.DISCORD_CLIENT_SECRET;

export const discord = discordClientId && discordClientSecret
  ? new Discord(discordClientId, discordClientSecret, `${baseURL}/v3/auth/discord/callback`)
  : null;

const facebookClientId = Bun.env.FACEBOOK_CLIENT_ID;
const facebookClientSecret = Bun.env.FACEBOOK_CLIENT_SECRET;

export const facebook = facebookClientId && facebookClientSecret
  ? new Facebook(facebookClientId, facebookClientSecret, `${baseURL}/v3/auth/facebook/callback`)
  : null;

export const oauthProviders = {
  google,
  github,
  discord,
  facebook,
} as const;

export type OAuthProvider = keyof typeof oauthProviders;
