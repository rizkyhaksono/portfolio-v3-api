/** Origins allowed for CORS and Lucia origin verification (cross-origin API calls). */

const PRODUCTION_ORIGINS = [
  "https://rizkyhaksono.vercel.app",
  "rizkyhaksono.vercel.app",
  "https://rizkyhaksono.natee.my.id",
  "rizkyhaksono.natee.my.id",
  "https://nateee.com",
  "nateee.com",
  "https://azure.nateee.com",
  "azure.nateee.com",
  "https://natee.my.id",
  "natee.my.id",
  "https://nateon.io",
  "nateon.io",
];

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3005",
  "localhost:3000",
  "localhost:3001",
  "localhost:3005",
];

function dedupe(origins: string[]): string[] {
  return [...new Set(origins.filter(Boolean))];
}

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
  const extra = process.env.CORS_EXTRA_ORIGINS
    ? process.env.CORS_EXTRA_ORIGINS.split(",").map((o) => o.trim())
    : [];

  if (process.env.NODE_ENV === "development") {
    return dedupe([...PRODUCTION_ORIGINS, ...LOCAL_DEV_ORIGINS, ...fromEnv, ...extra]);
  }

  return dedupe([...PRODUCTION_ORIGINS, ...fromEnv, ...extra]);
}
