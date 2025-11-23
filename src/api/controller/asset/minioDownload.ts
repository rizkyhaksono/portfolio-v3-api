import { createElysia } from "@/libs/elysia";
import { minioModel } from "@/models/minio.model";
import { getMiniObject, getMinioPublicLink } from "@/utils/minioUtils";
import { fileTypeFromBuffer } from "file-type";

export default createElysia()
  .use(minioModel)
  .post(
    "/minio/download",
    async ({
      body
    }: {
      body: {
        filename: string;
      }
    }) => {
      const chunks: Buffer[] = [];
      for await (const chunk of await getMiniObject(body.filename)) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks as unknown as Uint8Array[]);

      const type = await fileTypeFromBuffer(new Uint8Array(fileBuffer));
      if (!type) {
        return {
          data: null,
          message: "Unable to determine file type",
        };
      }

      const headers = {
        "Content-Type": type?.mime ?? "image/jpeg",
        "Content-Disposition": `attachment; filename="${body.filename}"`,
      };

      return new Response(fileBuffer, { headers });
    },
    {
      body: "minio.download",
      detail: {
        tags: ["Assets"],
        summary: "Download File from MinIO",
        description: "Download a file from MinIO by its filename",
      }
    }
  )
  .post(
    "/minio/download/public",
    async ({
      body
    }: {
      body: {
        filename: string;
      }
    }) => {
      return {
        data: getMinioPublicLink(body.filename),
        message: "success",
      };
    },
    {
      body: "minio.download",
      detail: {
        tags: ["Assets"],
        summary: "Get Public Link from MinIO",
        description: "Get a public link for a file stored in MinIO by its filename",
      }
    }
  );