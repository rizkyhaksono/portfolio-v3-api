import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { idParams } from "@/models/params.model";

export default createElysia()
  .get("/:id", async ({ params: { id } }: { params: { id: string } }) => {
    const work = await prismaClient.work.findUnique({
      where: { id },
    })

    return {
      status: 200,
      data: work
    }
  }, {
    params: idParams,
    detail: {
      tags: ["Work"],
      summary: "Get Work by ID",
      description: "Retrieve a work entry by its ID"
    }
  })
