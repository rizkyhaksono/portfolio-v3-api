import { createElysia } from "@/libs/elysia";
import { userGuard } from "@/libs/roleGuards";
import MinioClient from "@/libs/minioClient";
import { prismaClient } from "@/libs/prismaDatabase";
import { NotFoundException } from "@/constants/exceptions";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";
import { authGuard } from "@/libs/authGuard";

/**
 * Delete user avatar
 */
export default createElysia()
  .use(authGuard)
  .use(userGuard)
  .delete(
    "/avatar",
    async ({ user }) => {
      const currentUser = await prismaClient.user.findUnique({
        where: { id: user!.id },
        select: { avatarMinioKey: true },
      });

      if (!currentUser?.avatarMinioKey) {
        throw new NotFoundException("No avatar found to delete");
      }

      const bucketName = Bun.env.MINIO_BUCKET_NAME!;

      try {
        // Delete from Minio
        await MinioClient.removeObject(bucketName, currentUser.avatarMinioKey);

        // Clear from database
        await prismaClient.user.update({
          where: { id: user!.id },
          data: {
            avatarUrl: null,
            avatarMinioKey: null,
          },
        });

        logger.info({
          message: "Avatar deleted",
          userId: user!.id,
          key: currentUser.avatarMinioKey,
        });

        return {
          status: 200,
          message: "Avatar deleted successfully",
        };
      } catch (error) {
        logger.error({
          message: "Failed to delete avatar",
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
        summary: "Delete user avatar",
        description: "Remove user avatar from Minio storage",
      },
    }
  );
