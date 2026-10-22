import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import projectModel from "@/models/project.model";
import { adminGuard } from "@/libs/roleGuards";
import { idParams } from "@/models/params.model";

export default createElysia()
  .use(authGuard)
  .use(projectModel)
  .use(adminGuard)
  .patch("/:id", async ({ body, params: { id } }) => {
    await prismaClient.project.update({
      where: { id },
      data: body,
    })
    return {
      status: 200,
      message: "Project updated successfully",
    }
  }, {
    body: "project.model",
    params: idParams,
    detail: {
      tags: ["Project"],
      summary: "Update Project",
      description: "Update an existing project by its ID"
    }
  })
