import { createElysia } from "@/libs/elysia";
import { authGuard } from "@/libs/authGuard";
import { prismaClient } from "@/libs/prismaDatabase";
import educationModel from "@/models/education.model";
import { Education } from "../../../../generated/prisma/browser";
import { adminGuard } from "@/libs/roleGuards";

export default createElysia()
  .use(authGuard)
  .use(adminGuard)
  .use(educationModel)
  .patch("/:id", async ({
    body,
    params: { id }
  }: {
    body: Education
    params: { id: string }
  }) => {
    return prismaClient.education.update({
      where: { id },
      data: {
        ...body
      }
    })
  }, {
    body: "education.model",
    detail: {
      tags: ["Education"],
      summary: "Update an education record",
      description: "Updates an existing education record in the database.",
      response: {
        200: {
          description: "Education record updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Education"
              }
            }
          }
        }
      }
    }
  })