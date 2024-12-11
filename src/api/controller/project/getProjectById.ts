import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .get("/:id", async ({ params: { id } }) => {
    const project = await prismaClient.project.findUnique({
      where: { id: parseInt(id) },
    })

    return {
      status: 200,
      data: project
    }
  }, {
    detail: {
      tags: ["Project"]
    }
  })