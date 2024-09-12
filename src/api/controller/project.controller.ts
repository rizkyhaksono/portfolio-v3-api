import { createElysia } from "@/lib/elysia";
import { prismaClient } from "@/lib/prismaDatabase";


export const projectController = createElysia().get("/", async () => {
  return {
    status: 200,
    data: prismaClient.project.findMany()
  }
}, {
  tags: ["Projects"]
})