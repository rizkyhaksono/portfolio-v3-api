import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import projectModel from "@/models/project.model";

export default createElysia()
  .use(projectModel)
  .post("/", async ({ body }) => {
    return await prismaClient.project.create({
      data: {
        ...body,
      }
    })
  }, {
    body: "project.model",
    detail: {
      tags: ["Project"],
    }
  })