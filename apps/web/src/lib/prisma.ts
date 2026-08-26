import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

// Neon's serverless driver speaks Neon's WebSocket protocol, not plain
// Postgres wire protocol - it can't reach a local/Docker Postgres. Use the
// standard pg adapter for any non-Neon host (local dev, Docker) and only use
// PrismaNeon against a real Neon endpoint (staging/production).
function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "";
  const isNeon = url.includes(".neon.tech");
  const adapter = isNeon ? new PrismaNeon({ connectionString: url }) : new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
