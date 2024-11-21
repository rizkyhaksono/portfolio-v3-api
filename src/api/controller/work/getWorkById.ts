import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

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