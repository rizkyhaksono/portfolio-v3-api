import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import projectModel from "@/models/project.model";

export default createElysia()
  .use(projectModel)
  .use(authGuard)
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