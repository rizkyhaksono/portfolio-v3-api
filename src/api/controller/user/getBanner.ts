import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";

export default createElysia()
  .use(userGuard)
  .use(authGuard)
  .get(
    "/banner",
    async ({ user }: any) => {
      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { bannerMinioKey: true },
      });

      if (!currentUser?.bannerMinioKey) throw new NotFoundException("No banner found");


      const bucketName = Bun.env.MINIO_BUCKET_NAME!;
      const expirySeconds = 7 * 24 * 60 * 60; // 7 days

      try {
        const url = await MinioClient.presignedUrl(
          "GET",
          bucketName,
          currentUser.bannerMinioKey,
          expirySeconds
        );

        logger.info({
          message: "Banner URL generated",
          userId: user!.id,
        });

        return {
          status: 200,
          message: "Banner URL retrieved successfully",
          data: {
            url,
            expiresIn: expirySeconds,
          },
        };
      } catch (error) {
        logger.error({
          message: "Failed to generate banner URL",
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
        summary: "Get user banner",
        description: "Get presigned URL for user banner from Minio",
      },
    }
  );
