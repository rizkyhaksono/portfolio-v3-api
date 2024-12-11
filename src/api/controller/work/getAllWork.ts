import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .get("/", async () => {
    const work = await prismaClient.work.findMany();
    return {
      status: 200,
      data: work,
    }
  }, {
    detail: {
      tags: ["Work"],
    }
  })