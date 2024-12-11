import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import projectModel from "@/models/project.model";

export default createElysia()
  .use(projectModel)
  .use(authGuard)
  .delete("/:id", async ({ params: { id } }) => {
    await prismaClient.project.delete({
      where: { id: parseInt(id) },
    })
    return {
      status: 200,
      message: "Project deleted successfully",
    }
  }, {
    body: "project.model",
    detail: {
      tags: ["Project"],
    },
  })