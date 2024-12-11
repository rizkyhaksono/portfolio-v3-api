import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import educationModel from "@/models/education.model";

export default createElysia()
  .use(authGuard)
  .use(educationModel)
  .delete("/:id", async ({ params: { id } }) => {
    await prismaClient.education.delete({
      where: { id: parseInt(id) }
    })
    return {
      status: 200,
      data: "Education deleted successfully"
    }
  }, {
    body: "education.model",
    detail: {
      tags: ["Education"]
    }
  })