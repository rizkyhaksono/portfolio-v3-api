import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { getMinioPublicLink, PRESIGN_MAX_SECONDS } from "@/utils/minioUtils";
import { detectImageType } from "@/utils/imageType";
import { BadRequestException } from "@/constants/exceptions";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";
import ShortUniqueId from "short-unique-id";

const uid = new ShortUniqueId({ length: 10 });

export default createElysia()
  .use(userGuard)
  .post(
    "/banner",
    async ({ body: { file }, user }: any) => {
      const buffer = await file.arrayBuffer();

      const type = await detectImageType(buffer);
      if (!type) throw new BadRequestException("File must be an image");

      const bucketName = Bun.env.MINIO_BUCKET_NAME!;
      const fileName = `banners/${user!.id}/${uid.rnd()}.${type.ext}`;

      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { bannerMinioKey: true },
      });

      await MinioClient.putObject(
        bucketName,
        fileName,
        Buffer.from(buffer),
        buffer.byteLength,
        {
          "Content-Type": type.mime,
        }
      );

      // Reads re-presign from the key (GET /v3/me), so this stored link is only a fallback.
      const bannerUrl = await getMinioPublicLink(fileName, PRESIGN_MAX_SECONDS);

      await prismaClient.user.update({
        where: { id: user!.id },
        data: {
          bannerUrl,
          bannerMinioKey: fileName,
        },
      });

      // Delete the old banner only once the new one is stored and referenced.
      if (currentUser?.bannerMinioKey) {
        try {
          await MinioClient.removeObject(bucketName, currentUser.bannerMinioKey);
          logger.info({
            message: "Old banner deleted",
            userId: user!.id,
            key: currentUser.bannerMinioKey,
          });
        } catch (error) {
          logger.warn({
            message: "Failed to delete old banner",
            userId: user!.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      logger.info({
        message: "Banner uploaded",
        userId: user!.id,
        fileName,
      });

      return {
        status: 200,
        message: "Banner uploaded successfully",
        data: {
          bannerUrl,
        },
      };
    }, {
    body: t.Object({
      file: t.File({
        type: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        maxSize: 5 * 1024 * 1024, // 5MB
      }),
    }),
    response: {
      200: t.Object({
        status: t.Number(),
        message: t.String(),
        data: t.Object({
          bannerUrl: t.String(),
        }),
      }),
    },
    detail: {
      tags: ["User"],
      summary: "Upload user banner",
      description: "Upload or update user banner image (replaces existing)",
    },
  });
