import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { idParams } from "@/models/params.model";

export default createElysia()
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
    params: idParams,
    detail: {
      tags: ["Work"],
      summary: "Delete Work",
      description: "Delete a work entry by its ID"
    }
  })
