import { ForbiddenException } from "@/constants/exceptions";
import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import projectModel from "@/models/project.model";

export default createElysia()
  .use(projectModel)
  .patch("/:id", async ({ body, params: { id } }) => {
    // if (!user.isAdmin) throw new ForbiddenException();

    await prismaClient.project.update({
      where: { id: parseInt(id) },
      data: body,
    })
    return {
      status: 200,
      message: "Project updated successfully",
    }
  }, {
    body: "project.model",
    detail: {
      tags: ["Project"],
    }
  })