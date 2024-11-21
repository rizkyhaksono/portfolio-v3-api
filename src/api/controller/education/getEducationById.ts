import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

export default createElysia()
  .get("/:id", async ({ params: { id } }) => {
    const education = await prismaClient.findUnique({
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