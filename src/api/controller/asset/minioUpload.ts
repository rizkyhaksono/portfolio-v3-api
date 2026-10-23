import ShortUniqueId from "short-unique-id";
import MinioClient from "@/libs/minioClient";
import { authGuard } from "@/libs/authGuard";
import { createElysia } from "@/libs/elysia";
import logger from "@/libs/lokiLogger";
import { getMinioPublicLink, PRESIGN_MAX_SECONDS } from "@/utils/minioUtils";
import { detectImageType } from "@/utils/imageType";
import { minioModel } from "@/models/minio.model";

export default createElysia()
  .use(minioModel)
  .use(authGuard)
  .post(
    "/minio",
    async ({
      body,
      set,
    }: {
      body: {
        file: File;
      };
      set: { status?: number };
    }) => {
      try {
        const fileBuffer = await body.file.arrayBuffer();
        const { randomUUID } = new ShortUniqueId({ length: 20 });

        const type = await detectImageType(fileBuffer, ["image/png", "image/jpeg", "image/gif", "image/bmp", "image/webp"]);
        if (!type) {
          set.status = 400;
          return {
            data: null,
            message: "Uploaded file is not a valid image",
          };
        }

        const fileName = `${randomUUID()}.${type.ext}`;
        const metadata = {
          "Content-Type": type.mime,
          "Content-Length": body.file.size.toString(),
        };

        await MinioClient.putObject(
          Bun.env.MINIO_BUCKET_NAME!,
          fileName,
          Buffer.from(fileBuffer),
          body.file.size,
          metadata
        );

        return {
          data: {
            fileName,
            publicLink: await getMinioPublicLink(fileName, PRESIGN_MAX_SECONDS),
            bucket: Bun.env.MINIO_BUCKET_NAME!,
            fileSize: body.file.size,
            metadata,
          },
          message: "success",
        };
      } catch (error) {
        logger.error({ message: "MinIO upload failed", error: error instanceof Error ? error.message : "Unknown error" });
        set.status = 500;
        return {
          data: null,
          message: "Upload failed. Please try again.",
        };
      }
    },
    {
      body: "minio.upload",
      type: "multipart/form-data",
      detail: {
        tags: ["Assets"],
        summary: "Upload File to MinIO",
        description: "Upload an image file to MinIO and get its public link",
      }
    }
  );
