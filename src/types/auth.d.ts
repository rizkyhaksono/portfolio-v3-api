export type AuthProvider = "google" | "github";

export type BaseAuthAccountInfo = {
  id: string;
  username: string;
  email: string;
  iconUrl: string;
};