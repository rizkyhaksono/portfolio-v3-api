import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { isMetaDataImg } from "@/utils/minioUtils";
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

      const isImage = await isMetaDataImg(buffer);
      if (!isImage) throw new BadRequestException("File must be an image");

      const bucketName = Bun.env.MINIO_BUCKET_NAME!;
      const fileName = `banners/${user!.id}_${uid.rnd()}_${file.name}`;

      // Delete old banner if exists
      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { bannerMinioKey: true },
      });

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

      // Upload new banner
      await MinioClient.putObject(
        bucketName,
        fileName,
        Buffer.from(buffer),
        buffer.byteLength,
        {
          "Content-Type": file.type,
        }
      );

      const bannerUrl = await MinioClient.presignedUrl("GET", bucketName, fileName, 0);

      await prismaClient.user.update({
        where: { id: user!.id },
        data: {
          bannerUrl,
          bannerMinioKey: fileName,
        },
      });

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
