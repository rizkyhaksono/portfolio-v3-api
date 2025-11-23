import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import projectModel from "@/models/project.model";
import { ProjectModel } from "../../../../generated/prisma/models";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(projectModel)
  .use(authGuard)
  .use(adminGuard)
  .post("/", async ({ body }: { body: ProjectModel }) => {
    return await prismaClient.project.create({
      data: {
        ...body,
      }
    })
  }, {
    body: "project.model",
    detail: {
      tags: ["Project"],
      summary: "Create Project",
      description: "Create a new project entry"
    }
  })