import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import educationModel from "@/models/education.model";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .use(educationModel)
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
    body: "education.model",
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