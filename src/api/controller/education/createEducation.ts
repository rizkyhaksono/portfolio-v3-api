import { createElysia } from "@/libs/elysia";
import { prismaClient } from "@/libs/prismaDatabase";
import { authGuard } from "@/libs/authGuard";
import { adminGuard } from "@/libs/roleGuards";
import educationModel from "@/models/education.model";
import { Education } from "../../../../generated/prisma/client";

export default createElysia()
  .use(educationModel)
  .use(authGuard)
  .use(adminGuard)
  .post("/", async ({ body }: { body: Education }) => {
    return await prismaClient.education.create({
      data: {
        ...body
      }
    })
  }, {
    body: "education.model",
    detail: {
      tags: ["Education"],
      summary: "Create a new education record",
      description: "Creates a new education record in the database. Admin access required.",
      response: {
        200: {
          description: "Education record created successfully",
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