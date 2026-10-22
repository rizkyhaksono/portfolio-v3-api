import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { idParams } from "@/models/params.model";

export default createElysia()
  .get("/:id", async ({
    params: { id }
  }: {
    params: { id: string };
  }) => {
    const education = await prismaClient.education.findUnique({
      where: { id },
    })
    return {
      status: 200,
      data: education
    }
  }, {
    params: idParams,
    detail: {
      tags: ["Education"],
      summary: "Get an education record by ID",
      description: "Retrieves a specific education record from the database using its ID.",
      response: {
        200: {
          description: "Education record retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "number" },
                  data: { $ref: "#/components/schemas/Education" }
                }
              }
            }
          }
        }
      }
    }
  })