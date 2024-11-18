import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
}

declare global {
  let prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = (globalThis as any).prismaGlobal || prismaClientSingleton();

export { prisma as prismaClient }

if (Bun.env.NODE_ENV !== "production") (globalThis as any).prismaGlobal = prisma;