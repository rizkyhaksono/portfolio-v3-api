import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .get("/:id", async ({ params: { id } }) => {
    const education = await prismaClient.education.findUnique({
      where: { id: parseInt(id) },
    })
    return {
      status: 200,
      data: education
    }
  }, {
    detail: {
      tags: ["Education"]
    }
  })