import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn("[prisma] DATABASE_URL 未设置，使用无适配器模式");
      return new PrismaClient();
    }
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  } catch {
    // Fallback for build time when pg isn't available
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
