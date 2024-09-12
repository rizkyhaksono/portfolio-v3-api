import { Work } from "@prisma/client";
import { prismaClient } from "../../lib/prismaDatabase";

export class WorkService {
  async createWork({
    logo,
    jobTitle,
    content,
    instance,
    instanceLink,
    address,
    duration,
  }: Work): Promise<Work> {
    return prismaClient.work.create({
      data: {
        logo,
        jobTitle,
        content,
        instance,
        instanceLink,
        address,
        duration,
      }
    })
  }

  async getAllWork(): Promise<Work[]> {
    return prismaClient.work.findMany();
  }

  async getWorkById(id: number): Promise<Work> {
    return prismaClient.work.findUnique({
      where: { id },
    })
  }

  async updateWorkById(id: number, data: any): Promise<Work> {
    let updateData: any = { ...data };

    return prismaClient.work.update({
      where: { id },
      data: { ...updateData },
    })
  }

  async deleteWorkById(id: number): Promise<Work> {
    return prismaClient.work.delete({
      where: { id },
    })
  }
}