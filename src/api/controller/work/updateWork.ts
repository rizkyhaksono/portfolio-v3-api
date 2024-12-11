import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import workModel from "@/models/work.model";

export default createElysia()
  .use(workModel)
  .patch("/:id", async ({ body, params: { id } }) => {
    await prismaClient.work.update({
      where: { id: parseInt(id) },
      data: body
    })
    return {
      status: 200,
      message: "Work updated successfully"
    }
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"]
    }
  })