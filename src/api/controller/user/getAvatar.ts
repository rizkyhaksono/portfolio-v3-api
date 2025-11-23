import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";

/**
 * Get user avatar presigned URL
 */
export default createElysia()
  .use(userGuard)
  .use(authGuard)
  .get(
    "/avatar",
    async ({ user }: any) => {
      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { avatarMinioKey: true },
      });

      if (!currentUser?.avatarMinioKey) {
        throw new NotFoundException("No avatar found");
      }

      const bucketName = Bun.env.MINIO_BUCKET_NAME!;
      const expirySeconds = 7 * 24 * 60 * 60; // 7 days

      try {
        // Generate presigned URL
        const url = await MinioClient.presignedUrl(
          "GET",
          bucketName,
          currentUser.avatarMinioKey,
          expirySeconds
        );

        logger.info({
          message: "Avatar URL generated",
          userId: user!.id,
        });

        return {
          status: 200,
          message: "Avatar URL retrieved successfully",
          data: {
            url,
            expiresIn: expirySeconds,
          },
        };
      } catch (error) {
        logger.error({
          message: "Failed to generate avatar URL",
          userId: user!.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        throw error;
      }
    },
    {
      response: {
        200: t.Object({
          status: t.Number(),
          message: t.String(),
          data: t.Object({
            url: t.String(),
            expiresIn: t.Number(),
          }),
        }),
      },
      detail: {
        tags: ["User"],
        summary: "Get user avatar",
        description: "Get presigned URL for user avatar from Minio",
      },
    }
  );
