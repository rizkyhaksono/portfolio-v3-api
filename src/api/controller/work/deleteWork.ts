import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";
import workModel from "@/models/work.model";

export default createElysia()
  .use(workModel)
  .delete("/:id", async ({ params: { id } }) => {
    await prismaClient.work.delete({
      where: { id: parseInt(id) },
    })
    return {
      status: 200,
      message: "Work deleted successfully"
    }
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"]
    }
  })