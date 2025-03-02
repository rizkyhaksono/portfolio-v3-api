import { Elysia } from "elysia";
import { z } from "zod";

const envValidateScheme = z.object({
  NODE_ENV: z.string(),
  DOMAIN: z.string(),
  DATABASE_URL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  PASSWORD_PEPPER: z.string(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  MINIO_HOST: z.string(),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
});

const env = () => {
  const app = new Elysia({
    name: "env",
  });

  const env = envValidateScheme.parse(process.env);

  return app.decorate("env", {
    ...env,
    env: process.env,
  });
};

export { env };