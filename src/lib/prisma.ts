import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaClient: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Build time: DATABASE_URL not available, return a dummy client that throws on use
    return new PrismaClient();
  }

  try {
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  } catch {
    return new PrismaClient();
  }
}

/**
 * 获取 Prisma 客户端（懒加载）
 * 只在首次调用时才初始化，避免构建时 DATABASE_URL 未设置导致报错
 */
export function getPrisma(): PrismaClient {
  if (prismaClient) return prismaClient;
  if (globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
    return prismaClient;
  }
  prismaClient = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }
  return prismaClient;
}

// 保持向后兼容（但要通过代理延迟初始化）
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  },
});
