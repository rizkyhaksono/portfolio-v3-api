/** Public base URL of this API (defaults match .env.example). */
export const apiBaseUrl = () => process.env.BASE_URL || "http://localhost:3121";

/** Public URL of the Next.js frontend (defaults match .env.example). */
export const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:3001";
