import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .get("/", async () => {
    const project = await prismaClient.project.findMany();
    return {
      status: 200,
      data: project,
    }
  }, {
    detail: {
      tags: ["Project"],
    }
  })