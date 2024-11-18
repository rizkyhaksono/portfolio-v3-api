import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";
import projectModel from "@/models/project.model";

export default createElysia()
  .use(projectModel)
  .post("/", async ({ body }) => {
    return await prismaClient.project.create({
      data: {

      }
    })
  }, {
    body: "project.model",
    detail: {
      tags: ["Project"],
    }
  })