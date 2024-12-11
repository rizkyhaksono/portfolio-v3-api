import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import workModel from "@/models/work.model";

export default createElysia()
  .use(workModel)
  .use(authGuard)
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