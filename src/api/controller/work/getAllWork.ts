import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

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