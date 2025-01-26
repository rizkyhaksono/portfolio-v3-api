import { createElysia } from "@/libs/elysia";
import { minioModel } from "@/models/minio.model";
import { getMiniObject, getMinioPublicLink } from "@/utils/minioUtils";
import { fileTypeFromBuffer } from "file-type";

export default createElysia()
  .use(minioModel)
  .post(
    "/minio/download",
    async ({ body }) => {
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
      tags: ["Assets"],
    }
  )
  .post(
    "/minio/download/public",
    async ({ body }) => {
      return {
        data: getMinioPublicLink(body.filename),
        message: "success",
      };
    },
    {
      body: "minio.download",
      tags: ["Assets"],
    }
  );