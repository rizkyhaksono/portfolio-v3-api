import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";
import projectModel from "@/models/project.model";

export default createElysia()
  .delete("/:id", async ({ params: { id } }) => {
    await prismaClient.project.delete({
      where: { id: parseInt(id) },
    })
    return {
      status: 200,
      message: "Project deleted successfully",
    }
  }, {
    detail: {
      tags: ["Project"],
    }
  })