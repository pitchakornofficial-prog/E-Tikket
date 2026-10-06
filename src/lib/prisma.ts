import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as typeof globalThis & {
  eTikketPrisma?: PrismaClient;
};

export const prisma = prismaGlobal.eTikketPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.eTikketPrisma = prisma;
}
