import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";

export default createElysia()
  .patch("/:id", async ({ params: { id } }) => {
    return {
      status: 200
    }
  }, {
    detail: {
      tags: ["Education"]
    }
  })