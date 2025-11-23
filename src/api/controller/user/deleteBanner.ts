import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";

/**
 * Delete user banner
 */
export default createElysia()
  .use(userGuard)
  .use(authGuard)
  .delete(
    "/banner",
    async ({ user }) => {
      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { bannerMinioKey: true },
      });

      if (!currentUser?.bannerMinioKey) {
        throw new NotFoundException("No banner found to delete");
      }

      const bucketName = Bun.env.MINIO_BUCKET_NAME!;

      try {
        // Delete from Minio
        await MinioClient.removeObject(bucketName, currentUser.bannerMinioKey);

        // Clear from database
        await prismaClient.user.update({
          where: { id: user!.id },
          data: {
            bannerUrl: null,
            bannerMinioKey: null,
          },
        });

        logger.info({
          message: "Banner deleted",
          userId: user!.id,
          key: currentUser.bannerMinioKey,
        });

        return {
          status: 200,
          message: "Banner deleted successfully",
        };
      } catch (error) {
        logger.error({
          message: "Failed to delete banner",
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
        }),
      },
      detail: {
        tags: ["User"],
        summary: "Delete user banner",
        description: "Remove user banner from Minio storage",
      },
    }
  );
