import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

export default createElysia()
  .get("/", async () => {
    const education = await prismaClient.education.findMany();
    return {
      status: 200,
      data: education
    }
  }, {
    detail: {
      tags: ["Education"]
    }
  })