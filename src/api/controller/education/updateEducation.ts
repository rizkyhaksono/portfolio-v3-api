import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

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