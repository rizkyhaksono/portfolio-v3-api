import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import workModel from "@/models/work.model";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(workModel)
  .use(authGuard)
  .use(adminGuard)
  .patch("/:id", async ({ body, params: { id } }) => {
    await prismaClient.work.update({
      where: { id },
      data: body
    })
    return {
      status: 200,
      message: "Work updated successfully"
    }
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"],
      summary: "Update Work",
      description: "Update an existing work entry by its ID"
    }
  })