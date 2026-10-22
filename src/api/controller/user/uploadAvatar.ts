import { BadRequestException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import logger from "@/libs/lokiLogger";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { userGuard } from "@/libs/roleGuards";
import { detectImageType } from "@/utils/imageType";
import { stableAvatarUrl } from "@/utils/userProfile";
import { t } from "elysia";
import ShortUniqueId from "short-unique-id";

const uid = new ShortUniqueId({ length: 10 });

export default createElysia()
  .use(userGuard)
  .post(
    "/avatar",
    async ({ body: { file }, user }: any) => {
      const buffer = await file.arrayBuffer();

      const type = await detectImageType(buffer);
      if (!type) throw new BadRequestException("File must be an image");

      const bucketName = Bun.env.MINIO_BUCKET_NAME!;
      const fileName = `avatars/${user!.id}/${uid.rnd()}.${type.ext}`;

      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { avatarMinioKey: true },
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

      const avatarUrl = stableAvatarUrl(user!.id, fileName);

      await prismaClient.user.update({
        where: { id: user!.id },
        data: {
          avatarUrl,
          avatarMinioKey: fileName,
        },
      });

      // Delete the old avatar only once the new one is stored and referenced.
      if (currentUser?.avatarMinioKey) {
        try {
          await MinioClient.removeObject(bucketName, currentUser.avatarMinioKey);
          logger.info({
            message: "Old avatar deleted",
            userId: user.id,
            key: currentUser.avatarMinioKey,
          });
        } catch (error) {
          logger.warn({
            message: "Failed to delete old avatar",
            userId: user.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      logger.info({
        message: "Avatar uploaded",
        userId: user!.id,
        fileName,
      });

      return {
        status: 200,
        message: "Avatar uploaded successfully",
        data: {
          avatarUrl,
        },
      };
    },
    {
      body: t.Object({
        file: t.File({
          type: ["image/png", "image/jpeg", "image/gif", "image/webp"],
          maxSize: 2 * 1024 * 1024, // 2MB
        }),
      }),
      response: {
        200: t.Object({
          status: t.Number(),
          message: t.String(),
          data: t.Object({
            avatarUrl: t.String(),
          }),
        }),
      },
      detail: {
        tags: ["User"],
        summary: "Upload user avatar",
        description: "Upload or update user avatar image (replaces existing)",
      },
    }
  );
