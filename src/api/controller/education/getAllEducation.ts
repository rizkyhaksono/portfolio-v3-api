import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

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