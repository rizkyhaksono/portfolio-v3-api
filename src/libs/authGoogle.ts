import { BaseAuthAccountInfo, } from "@/types/auth";
import { Google as GoogleInstance } from "arctic";

const clientId = Bun.env.GOOGLE_CLIENT_ID!;
const clientSecret = Bun.env.GOOGLE_CLIENT_SECRET!;
const baseURL = Bun.env.BASE_URL ?? "http://localhost:3121";

const google = new GoogleInstance(
  clientId,
  clientSecret,
  `${baseURL}/v2/auth/google/callback`
);