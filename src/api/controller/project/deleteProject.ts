import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { idParams } from "@/models/params.model";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .delete("/:id", async ({ params: { id } }) => {
    await prismaClient.project.delete({
      where: { id },
    })
    return {
      status: 200,
      message: "Project deleted successfully",
    }
  }, {
    params: idParams,
    detail: {
      tags: ["Project"],
      summary: "Delete Project",
      description: "Delete a project by its ID"
    },
  })
