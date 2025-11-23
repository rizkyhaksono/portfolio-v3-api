import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import workModel from "@/models/work.model";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(workModel)
  .use(authGuard)
  .use(adminGuard)
  .delete("/:id", async ({ params: { id } }) => {
    await prismaClient.work.delete({
      where: { id },
    })
    return {
      status: 200,
      message: "Work deleted successfully"
    }
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"],
      summary: "Delete Work",
      description: "Delete a work entry by its ID"
    }
  })