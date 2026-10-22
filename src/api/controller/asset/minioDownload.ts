import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { minioModel } from "@/models/minio.model";
import { attachmentDisposition, getMiniObject, getMinioPublicLink } from "@/utils/minioUtils";
import { BadRequestException, NotFoundException } from "@/constants/exceptions";
import { fileTypeFromBuffer } from "file-type";

const DOWNLOAD_LINK_SECONDS = 15 * 60;

export default createElysia()
  .use(minioModel)
  .use(authGuard)
  .use(adminGuard)
  .post(
    "/minio/download",
    async ({
      body
    }: {
      body: {
        filename: string;
      }
    }) => {
      const object = await getMiniObject(body.filename).catch((err: { code?: string }) => {
        throw err?.code === "NoSuchKey" ? new NotFoundException("File not found") : err;
      });
      const chunks: Buffer[] = [];
      for await (const chunk of object) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks as unknown as Uint8Array[]);

      const type = await fileTypeFromBuffer(new Uint8Array(fileBuffer));
      if (!type) throw new BadRequestException("Unable to determine file type");

      const headers = {
        "Content-Type": type.mime,
        "Content-Disposition": attachmentDisposition(body.filename),
      };

      return new Response(fileBuffer, { headers });
    },
    {
      body: "minio.download",
      detail: {
        tags: ["Assets"],
        summary: "Download File from MinIO (admin)",
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
        data: await getMinioPublicLink(body.filename, DOWNLOAD_LINK_SECONDS),
        message: "success",
      };
    },
    {
      body: "minio.download",
      detail: {
        tags: ["Assets"],
        summary: "Get a short-lived link from MinIO (admin)",
        description: "Get a 15-minute presigned link for a file stored in MinIO by its filename",
      }
    }
  );
