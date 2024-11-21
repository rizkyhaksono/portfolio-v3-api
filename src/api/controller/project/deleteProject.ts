import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";
import projectModel from "@/models/project.model";

export default createElysia()
  .use(projectModel)
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
    }
  })