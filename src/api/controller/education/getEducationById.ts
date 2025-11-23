import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import educationModel from "@/models/education.model";

export default createElysia()
  .use(educationModel)
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
    body: "education.model",
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