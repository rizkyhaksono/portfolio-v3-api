import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import projectModel from "@/models/project.model";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(projectModel)
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
    body: "project.model",
    detail: {
      tags: ["Project"],
      summary: "Delete Project",
      description: "Delete a project by its ID"
    },
  })