import ShortUniqueId from "short-unique-id";
import MinioClient from "@/libs/minioClient";
import { authGuard } from "@/libs/authGuard";
import { createElysia } from "@/libs/elysia";
import { getMinioPublicLink, isMetaDataImg } from "@/utils/minioUtils";
import { minioModel } from "@/models/minio.model";

export default createElysia()
  .use(minioModel)
  .use(authGuard)
  .post(
    "/minio",
    async ({ body }) => {
      try {
        const fileBuffer = await body.file.arrayBuffer();
        const { randomUUID } = new ShortUniqueId({ length: 20 });

        if (!(await isMetaDataImg(fileBuffer))) {
          return {
            data: null,
            message: "Uploaded file is not a valid image",
          };
        }

        const fileName = `${randomUUID()}.png`;
        const metadata = {
          "Content-Type": body.file.type,
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
            publicLink: await getMinioPublicLink(fileName),
            bucket: Bun.env.MINIO_BUCKET_NAME!,
            fileSize: body.file.size,
            metadata,
          },
          message: "success",
        };
      } catch (error) {
        return {
          data: "There is something wrong",
          message: error,
        };
      }
    },
    {
      body: "minio.upload",
      type: "multipart/form-data",
      tags: ["Assets"],
    }
  );