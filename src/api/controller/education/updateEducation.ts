import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";
import educationModel from "@/models/education.model";

export default createElysia()
  .use(authGuard)
  .use(educationModel)
  .patch("/:id", async ({ body, params: { id } }) => {
    return prismaClient.education.update({
      where: { id: parseInt(id) },
      data: {
        ...body
      }
    })
  }, {
    body: "education.model",
    detail: {
      tags: ["Education"]
    }
  })