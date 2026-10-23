import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import { idParams } from "@/models/params.model";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .delete("/:id", async ({
    params: { id }
  }: {
    params: { id: string };
  }) => {
    await prismaClient.education.delete({
      where: { id }
    })
    return {
      status: 200,
      data: "Education deleted successfully"
    }
  }, {
    params: idParams,
    detail: {
      tags: ["Education"],
      summary: "Delete an education record",
      description: "Deletes an education record from the database. Admin access required.",
      response: {
        200: {
          description: "Education record deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "number" },
                  data: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  })