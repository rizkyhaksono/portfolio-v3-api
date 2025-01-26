import Elysia, { t } from "elysia";

export const minioModel = new Elysia().model({
  "minio.upload": t.Object({
    file: t.File({
      type: ["image/png", "image/jpeg", "image/gif", "image/bmp", "image/webp"], // List of acceptable image types
      maxSize: 5 * 1024 * 1024,
    }),
  }),
  "minio.download": t.Object({
    filename: t.String({}),
  }),
});