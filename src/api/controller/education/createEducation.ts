import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import educationModel from "@/models/education.mode";

export default createElysia()
  .use(educationModel)
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