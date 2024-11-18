import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

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