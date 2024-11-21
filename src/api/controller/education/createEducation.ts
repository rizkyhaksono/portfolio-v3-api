import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";
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