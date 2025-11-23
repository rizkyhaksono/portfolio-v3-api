import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import workModel from "@/models/work.model";

export default createElysia()
  .use(workModel)
  .get("/:id", async ({ params: { id } }: { params: { id: string } }) => {
    const work = await prismaClient.work.findUnique({
      where: { id },
    })

    return {
      status: 200,
      data: work
    }
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"],
      summary: "Get Work by ID",
      description: "Retrieve a work entry by its ID"
    }
  })