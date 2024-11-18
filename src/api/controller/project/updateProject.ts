import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";

export default createElysia()
  .patch("/:id", async ({ body, params: { id } }) => {
    let updatedData = body;
    if (body) {
      
    }

    await prismaClient.project.update({
      where: { id: parseInt(id) }
      // data: 
    })
  })