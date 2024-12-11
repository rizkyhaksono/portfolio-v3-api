import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .get("/:id", async ({ params: { id } }) => {
    const work = await prismaClient.work.findUnique({
      where: { id: parseInt(id) },
    })

    return {
      status: 200,
      data: work
    }
  }, {
    detail: {
      tags: ["Work"]
    }
  })