import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import educationModel from "@/models/education.mode";

export default createElysia()
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