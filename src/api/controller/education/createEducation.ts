import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import educationModel from "@/models/education.model";

export default createElysia()
  .use(educationModel)
  .use(authGuard)
  .post("/", async ({ body }) => {
    return await prismaClient.education.create({
      data: {
        ...body
      }
    })
  }, {
    body: "education.model",
    detail: {
      tags: ["Education"],
    }
  })