import { Prisma, Work } from "@prisma/client";

interface WorkResponseSchema extends Work {
  response: string[]
}

interface WorkWithResponsibilitySchema extends Work {
  responsibilities: string[];
}

interface WorkRequest extends Prisma.WorkCreateInput {
  logo: string
  jobTitle: string
  content: string
  instance: string
  instanceLink: string
  address: string
  duration: string
  created_at?: Date | string
  updated_at?: Date | string
}


export { WorkResponseSchema, WorkRequest, WorkWithResponsibilitySchema };