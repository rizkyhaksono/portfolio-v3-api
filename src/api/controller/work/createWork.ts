import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import workModel from "@/models/work.model";
import { WorkModel } from "../../../../generated/prisma/models";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(workModel)
  .use(authGuard)
  .use(adminGuard)
  .post("/", async ({ body }: { body: WorkModel }) => {
    return await prismaClient.work.create({
      data: {
        ...body
      }
    })
  }, {
    body: "work.model",
    detail: {
      tags: ["Work"],
      summary: "Create Work",
      description: "Create a new work entry"
    }
  })