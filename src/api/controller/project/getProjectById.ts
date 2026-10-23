import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import projectModel from "@/models/project.model";
import { idParams } from "@/models/params.model";

export default createElysia()
  .use(projectModel)
  .get("/:id", async ({
    params: { id }
  }: {
    params: { id: string };
  }) => {
    const project = await prismaClient.project.findUnique({
      where: { id },
    })
    return {
      status: 200,
      data: project
    }
  }, {
    params: idParams,
    detail: {
      tags: ["Project"],
      summary: "Get Project by ID",
      description: "Retrieve a project entry by its ID"
    }
  })
