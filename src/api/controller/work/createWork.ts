import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";
import workModel from "@/models/work.model";

export default createElysia()
  .use(workModel)
  .post("/", async ({ body }) => {
    return await prismaClient.work.create({
      data: {
        ...body
      }
    })
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"],
    }
  })